import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'an_admin_auth';
const SECRET = process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok';

async function checkAuth(request: NextRequest): Promise<boolean> {
  const headerToken = request.headers.get('X-Admin-Token');
  if (headerToken === SECRET) return true;
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SECRET;
}

export async function POST(request: NextRequest) {
  if (!await checkAuth(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, grade } = await request.json();
  if (!userId || !['normal', 'vip', 'vvip'].includes(grade))
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminSupabase
    .from('profiles')
    .upsert({ id: userId, grade }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
