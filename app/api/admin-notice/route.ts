import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'an_admin_auth';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function isAuthed(token: string | undefined) {
  return token === (process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok');
}

// 생성
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore.get(SESSION_COOKIE)?.value))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, category, is_published } = await request.json();
  if (!title || !content) return NextResponse.json({ error: 'title, content required' }, { status: 400 });

  const { data, error } = await adminSupabase
    .from('notices')
    .insert({ title, content, category: category ?? '이용안내', is_published: is_published ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// 수정
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore.get(SESSION_COOKIE)?.value))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, title, content, category, is_published } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await adminSupabase
    .from('notices')
    .update({ title, content, category, is_published, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 삭제
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore.get(SESSION_COOKIE)?.value))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await adminSupabase.from('notices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
