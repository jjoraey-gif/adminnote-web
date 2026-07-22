import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, accountType, nickname, orgName, userId } = await request.json();

    if (!email || !password || !accountType) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // email_confirm: true → 이메일 인증 없이 바로 가입 완료
    const { data, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: accountType,
        nickname: nickname || null,
        ...(accountType === 'shared' && { org_name: orgName, shared_user_id: userId }),
      },
    });

    if (createError) {
      if (createError.message.includes('already registered') || createError.message.includes('already been registered')) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: '가입 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // profiles 테이블에 저장
    if (data.user) {
      await adminSupabase.from('profiles').insert({
        id: data.user.id,
        account_type: accountType,
        nickname: nickname || null,
        org_name: accountType === 'shared' ? orgName : null,
        user_id: accountType === 'shared' ? userId : null,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
