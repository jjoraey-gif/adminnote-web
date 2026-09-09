import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * 인증 메일(비밀번호 재설정 등) 링크의 착지 지점.
 *
 * 두 가지 방식을 모두 받는다.
 *  1) ?code=...                 → PKCE. 재설정을 "요청한 브라우저"에서만 성공한다
 *                                 (code_verifier 쿠키가 그 브라우저에만 있음).
 *  2) ?token_hash=...&type=...  → OTP 검증. 쿠키가 필요 없어 다른 기기/브라우저에서
 *                                 메일을 열어도 동작한다. 메일 템플릿을 이 형태로
 *                                 바꿔두면 사무실 PC에서 요청하고 휴대폰에서 열어도 된다.
 *
 * ※ 중요: 세션 쿠키는 반드시 "우리가 반환할 응답 객체"에 직접 세팅해야 한다.
 *   next/headers의 cookies()에 써도 NextResponse.redirect()로 만든 새 응답에는
 *   실리지 않아서, 로그인은 성공했는데 세션이 없는 상태로 착지하는 문제가 있었다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // 외부 사이트로의 리다이렉트를 막기 위해 같은 출처의 경로(/로 시작)만 허용
  const nextParam = searchParams.get('next');
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/reset-password?error=${reason}`);

  if (!code && !tokenHash) return fail('no_token');

  // 성공 시 돌려줄 응답을 먼저 만들고, 세션 쿠키를 이 응답에 심는다.
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          });
        },
      },
    },
  );

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error('[auth/callback] verifyOtp 실패:', error.status, error.message);
      return fail('link_expired');
    }
    return response;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession 실패:', error.status, error.message);
    // code_verifier 쿠키가 없으면(=다른 브라우저에서 링크를 염) 여기서 실패한다.
    return fail('other_browser');
  }
  return response;
}
