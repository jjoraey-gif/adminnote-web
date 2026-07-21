import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { orgName, userId, password } = await request.json();

    if (!orgName || !userId || !password) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // service_role key로 이메일 조회
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await adminSupabase
      .rpc('get_email_by_shared_account', {
        p_org_name: orgName.trim(),
        p_user_id: userId.trim(),
      });

    if (error || !data) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    // 이메일로 로그인 시도 (브라우저 클라이언트는 anon key 사용)
    return NextResponse.json({ email: data });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
