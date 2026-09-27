import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * /stock 간편 로그인 (숫자 6자리 PIN)
 * 1) DB 함수 verify_stock_pin 으로 PIN 확인 (횟수 제한·잠금은 DB가 처리)
 * 2) 맞으면 서버에만 있는 소유자 계정(이메일/긴 무작위 비밀번호)으로 로그인해 세션을 돌려줌
 * → 브라우저는 PIN만 알고, 실제 계정 비밀번호는 Vercel 환경변수에만 존재.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_STOCK_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_STOCK_SUPABASE_ANON_KEY;
  const email = process.env.STOCK_OWNER_EMAIL;
  const password = process.env.STOCK_OWNER_PASSWORD;
  if (!url || !anon || !email || !password) {
    return NextResponse.json({ error: '서버 설정이 완료되지 않았습니다.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: '숫자 6자리를 입력하세요.' }, { status: 400 });
  }

  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: result, error: rpcError } = await sb.rpc('verify_stock_pin', { pin });
  if (rpcError) return NextResponse.json({ error: '확인 중 오류가 발생했습니다.' }, { status: 500 });

  if (result === 'locked') {
    return NextResponse.json({ error: '여러 번 틀려 잠겼습니다. 잠시 후 다시 시도하세요.' }, { status: 429 });
  }
  if (result === 'not_set') {
    return NextResponse.json({ error: 'PIN이 아직 설정되지 않았습니다.' }, { status: 503 });
  }
  if (result !== 'ok') {
    return NextResponse.json({ error: 'PIN이 올바르지 않습니다.' }, { status: 401 });
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: '로그인 처리에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json(
    { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
