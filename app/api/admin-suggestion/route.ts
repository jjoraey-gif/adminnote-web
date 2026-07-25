import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'an_admin_auth';
const SECRET = process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkAuth(request: NextRequest): Promise<boolean> {
  const headerToken = request.headers.get('X-Admin-Token');
  if (headerToken === SECRET) return true;
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SECRET;
}

// 읽음 토글
export async function PATCH(request: NextRequest) {
  if (!await checkAuth(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, is_read } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await adminSupabase
    .from('suggestions')
    .update({ is_read })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 삭제
export async function DELETE(request: NextRequest) {
  if (!await checkAuth(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await adminSupabase.from('suggestions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
