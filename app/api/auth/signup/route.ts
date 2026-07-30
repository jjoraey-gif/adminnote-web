import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── 레이트 리밋 (IP당 5회/1시간) — 대량 계정 생성 방지 ──
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count += 1;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_TYPES = ['personal', 'shared'];

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  try {
    const { email, password, accountType, nickname, orgName, userId } = await request.json();

    // ── 서버측 입력 검증 ──
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254) {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }
    if (!ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json({ error: '잘못된 계정 유형입니다.' }, { status: 400 });
    }
    if (nickname != null && (typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 20)) {
      return NextResponse.json({ error: '닉네임은 2~20자여야 합니다.' }, { status: 400 });
    }
    if (accountType === 'shared') {
      if (typeof orgName !== 'string' || !orgName.trim() || orgName.length > 50) {
        return NextResponse.json({ error: '기관명을 확인해주세요. (50자 이하)' }, { status: 400 });
      }
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 30) {
        return NextResponse.json({ error: '아이디를 확인해주세요. (30자 이하)' }, { status: 400 });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = typeof nickname === 'string' ? nickname.trim() : null;

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // email_confirm: true → 이메일 인증 없이 바로 가입 완료
    // ※ 보안 참고: 이메일 소유 확인을 건너뛰므로 타인 이메일로 계정 선점이 가능합니다.
    //   운영 정책상 허용 중이며, 강화가 필요하면 false로 변경하고
    //   Supabase 이메일 인증 플로우를 사용하세요.
    const { data, error: createError } = await adminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: accountType,
        nickname: cleanNick,
        ...(accountType === 'shared' && { org_name: orgName.trim(), shared_user_id: userId.trim() }),
      },
    });

    if (createError) {
      if (createError.message.includes('already registered') || createError.message.includes('already been registered')) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
      }
      console.error('[signup]', createError);
      return NextResponse.json({ error: '가입 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // profiles 테이블에 저장
    if (data.user) {
      const { error: profileError } = await adminSupabase.from('profiles').insert({
        id: data.user.id,
        email: cleanEmail,
        account_type: accountType,
        nickname: cleanNick,
        org_name: accountType === 'shared' ? orgName.trim() : null,
        user_id: accountType === 'shared' ? userId.trim() : null,
      });
      if (profileError) {
        // 프로필 생성 실패 시 계정도 롤백 (고아 계정 방지)
        console.error('[signup] profile insert 실패, 계정 롤백:', profileError);
        await adminSupabase.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({ error: '가입 중 오류가 발생했습니다. 다시 시도해주세요.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
