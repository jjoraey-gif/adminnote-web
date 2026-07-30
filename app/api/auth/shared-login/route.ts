import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── 레이트 리밋 (IP당 10회/10분) ──
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const FAIL_MSG = '아이디 또는 비밀번호가 올바르지 않습니다.';

/**
 * 공용폰 로그인 — 기관명 + 아이디 + 비밀번호를 모두 검증한 뒤에만 이메일을 반환.
 * (이전 버전은 password를 검증하지 않고 이메일을 반환해서 계정 열거가 가능했음)
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  try {
    const { orgName, userId, password } = await request.json();

    if (typeof orgName !== 'string' || typeof userId !== 'string' || typeof password !== 'string' ||
        !orgName.trim() || !userId.trim() || !password) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const adminSupabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: email, error } = await adminSupabase
      .rpc('get_email_by_shared_account', {
        p_org_name: orgName.trim(),
        p_user_id: userId.trim(),
      });

    // 계정을 못 찾은 경우도 비밀번호 틀린 경우와 동일하게 응답 (열거 방지)
    if (error || !email) {
      await sleep(500);
      return NextResponse.json({ error: FAIL_MSG }, { status: 401 });
    }

    // ★ 비밀번호를 서버에서 반드시 검증한다.
    // anon 클라이언트로 실제 로그인을 시도해 비밀번호가 맞는지 확인 (세션은 저장하지 않음).
    const verifyClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInError } =
      await verifyClient.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.session) {
      await sleep(500);
      // 이메일 미인증 등 구분이 필요한 경우만 별도 메시지
      if (signInError?.message?.includes('Email not confirmed')) {
        return NextResponse.json({ error: '이메일 인증이 필요합니다.' }, { status: 401 });
      }
      return NextResponse.json({ error: FAIL_MSG }, { status: 401 });
    }

    // 검증에 사용한 세션은 즉시 폐기
    await verifyClient.auth.signOut();

    // 비밀번호가 확인된 경우에만 이메일 반환 (클라이언트가 브라우저 세션을 수립)
    return NextResponse.json({ email });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
