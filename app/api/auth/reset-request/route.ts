import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 비밀번호 초기화 요청 접수 (로그인 화면 → "비밀번호 초기화 요청하기")
 *
 * 메일을 자동 발송하지 않고 요청만 기록한다. 관리자가 관리자 페이지에서 확인한 뒤
 * 임시 비밀번호를 발급해 직접 전달한다.
 *
 * POST /api/auth/reset-request { email }
 *
 * ※ 계정이 존재하는지 여부는 응답에 드러내지 않는다(가입 여부 탐색 방지).
 *   가입되지 않은 이메일도 정상 응답을 주되, 기록은 남기지 않는다.
 */

// 같은 이메일로 이 시간 안에 이미 요청이 있으면 새로 쌓지 않는다
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (typeof email !== 'string') {
    return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: '이메일 형식을 확인해주세요.' }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 가입된 계정인지 확인 — 없으면 기록하지 않고 조용히 성공 응답
    const { data: listData, error: listErr } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;

    const exists = (listData?.users ?? []).some(u => (u.email ?? '').toLowerCase() === cleanEmail);
    if (!exists) return NextResponse.json({ success: true });

    // 최근 24시간 내 같은 이메일의 미처리 요청이 있으면 중복 기록하지 않는다
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: dup } = await adminSupabase
      .from('password_reset_requests')
      .select('id')
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .gte('created_at', since)
      .limit(1);

    if (dup && dup.length > 0) return NextResponse.json({ success: true });

    const { error: insertErr } = await adminSupabase
      .from('password_reset_requests')
      .insert({ email: cleanEmail });

    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[reset-request] 요청 기록 실패:', e);
    return NextResponse.json({ error: '요청 접수에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
  }
}
