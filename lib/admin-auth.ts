import 'server-only';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';

export const ADMIN_COOKIE = 'an_admin_auth';

/** 상수 시간 문자열 비교 — 길이 차이로 인한 예외 없이 안전하게 비교 */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * 관리자 세션 시크릿을 반환. 환경변수가 없으면 null.
 * 절대 하드코딩 폴백값을 두지 않는다 — 없으면 인증 실패로 처리.
 */
export function getAdminSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    console.error('[admin-auth] ADMIN_SESSION_SECRET 미설정 또는 너무 짧음 (16자 이상 필요)');
    return null;
  }
  return s;
}

/**
 * 쿠키 기반 관리자 인증 검사.
 * @returns true = 인증됨
 */
export async function isAdminAuthed(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return safeEqual(token, secret);
}

/** 인증 실패 시 반환할 표준 응답 */
export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
