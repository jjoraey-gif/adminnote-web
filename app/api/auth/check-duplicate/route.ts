import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { type, value } = await request.json();

    if (!type || !value) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (type === 'email') {
      const { data, error } = await adminSupabase.auth.admin.getUserByEmail(value.trim().toLowerCase());
      if (error && error.message.includes('User not found')) {
        return NextResponse.json({ available: true });
      }
      if (data?.user) {
        return NextResponse.json({ available: false, message: '이미 사용 중인 이메일입니다.' });
      }
      return NextResponse.json({ available: true });
    }

    if (type === 'nickname') {
      const { data } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('nickname', value.trim())
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
