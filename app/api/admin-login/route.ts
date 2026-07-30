import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, getAdminSecret, safeEqual } from '@/lib/admin-auth';

// ── 간단한 인메모리 레이트 리밋 (IP당 5회/15분) ──
// 서버리스 인스턴스별로 독립적이므로 완벽하지 않지만 단순 브루트포스는 차단됨.
// 강한 보장이 필요하면 Upstash Redis 등 외부 저장소로 교체.
const WINDOW_MS = 15 * 60 * 1000;
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

function clearRateLimit(ip: string) {
  attempts.delete(ip);
}

/** 응답 시간을 균일하게 만들어 타이밍 오라클 제거 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  const secret = getAdminSecret();
  const adminId = process.env.ADMIN_ID;
  const adminPw = process.env.ADMIN_PW;

  if (!secret || !adminId || !adminPw) {
    console.error('[admin-login] ADMIN_SESSION_SECRET / ADMIN_ID / ADMIN_PW 환경변수 확인 필요');
    return NextResponse.json({ error: '서버 설정 오류입니다. 관리자에게 문의하세요.' }, { status: 500 });
  }

  let id: unknown, pw: unknown;
  try {
    const body = await request.json();
    id = body.id;
    pw = body.pw;
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  if (typeof id !== 'string' || typeof pw !== 'string') {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  // 두 비교를 모두 수행 (단축 평가 없음) → ID 정답 여부가 응답 시간에 드러나지 않음
  const idOk = safeEqual(id, adminId);
  const pwOk = safeEqual(pw, adminPw);

  if (!idOk || !pwOk) {
    await sleep(400); // 고정 지연
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  clearRateLimit(ip);

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8시간
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/jjoraey' });
  return res;
}
