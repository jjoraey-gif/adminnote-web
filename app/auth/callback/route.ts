import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 비밀번호 재설정 메일처럼 인증 후 특정 페이지로 보내야 하는 경우 사용.
  // 외부 사이트로의 리다이렉트를 막기 위해 같은 출처의 경로(/로 시작)만 허용한다.
  const next = searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
