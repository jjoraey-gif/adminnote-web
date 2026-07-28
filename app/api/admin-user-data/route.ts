import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  // 관리자 인증 확인
  const cookieStore = await cookies();
  const token = cookieStore.get('an_admin_auth')?.value;
  const secret = process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok';
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await adminSupabase
    .from('user_snapshots')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ data: null });

  return NextResponse.json({ data: data.data, updatedAt: data.updated_at });
}
