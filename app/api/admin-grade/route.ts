import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'an_admin_auth';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token !== (process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, grade } = await request.json();
  if (!userId || !['normal', 'vip', 'vvip'].includes(grade)) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminSupabase
    .from('profiles')
    .update({ grade })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
