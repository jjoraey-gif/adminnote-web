import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── 레이트 리밋 (IP당 30회/10분) ──
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;
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

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  try {
    const { type, value } = await request.json();

    if (typeof type !== 'string' || typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }
    if (value.length > 100) {
      return NextResponse.json({ error: '입력이 너무 깁니다.' }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (type === 'email') {
      if (!EMAIL_RE.test(value.trim())) {
        return NextResponse.json({ available: false, message: '올바른 이메일 형식이 아닙니다.' });
      }
      const { data } = await adminSupabase
        .rpc('check_email_exists', { p_email: value.trim().toLowerCase() });
      if (data === true) {
        return NextResponse.json({ available: false, message: '이미 사용 중인 이메일입니다.' });
      }
      return NextResponse.json({ available: true });
    }

    if (type === 'nickname') {
      const nick = value.trim();
      if (nick.length < 2 || nick.length > 20) {
        return NextResponse.json({ available: false, message: '닉네임은 2~20자여야 합니다.' });
      }
      const { data } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('nickname', nick)
        .limit(1);
      if (data && data.length > 0) {
        return NextResponse.json({ available: false, message: '이미 사용 중인 닉네임입니다.' });
      }
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({ error: '잘못된 type입니다.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
