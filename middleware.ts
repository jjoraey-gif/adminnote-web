import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_COOKIE = 'an_admin_auth';

/** Edge 런타임용 상수 시간 비교 (Web Crypto 기반) */
async function safeEqualEdge(a: string | undefined | null, b: string | undefined | null): Promise<boolean> {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  // /dashboard 는 관리자 전용 — 일반 로그인 사용자 접근 차단.
  // (이전에는 로그인 여부만 확인해서 일반 회원이 공지사항을 조작할 수 있었음)
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!await safeEqualEdge(token, secret)) {
    return NextResponse.redirect(new URL('/jjoraey', request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
