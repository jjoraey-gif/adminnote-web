import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

const CATEGORIES = ['이용안내', '업데이트'];

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// 생성
export async function POST(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, category, is_published } = await request.json();
  if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim())
    return NextResponse.json({ error: 'title, content required' }, { status: 400 });
  if (title.length > 200 || content.length > 10000)
    return NextResponse.json({ error: '길이 초과' }, { status: 400 });
  if (category && !CATEGORIES.includes(category))
    return NextResponse.json({ error: '잘못된 category' }, { status: 400 });

  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('notices')
    .insert({ title, content, category: category ?? '이용안내', is_published: is_published ?? true })
    .select()
    .single();

  if (error) { console.error('[admin-notice POST]', error); return NextResponse.json({ error: '등록 실패' }, { status: 500 }); }
  return NextResponse.json({ ok: true, data });
}

// 수정
export async function PUT(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, title, content, category, is_published } = await request.json();
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim())
    return NextResponse.json({ error: 'title, content required' }, { status: 400 });
  if (title.length > 200 || content.length > 10000)
    return NextResponse.json({ error: '길이 초과' }, { status: 400 });
  if (category && !CATEGORIES.includes(category))
    return NextResponse.json({ error: '잘못된 category' }, { status: 400 });

  const adminSupabase = getAdminSupabase();
  const { error } = await adminSupabase
    .from('notices')
    .update({ title, content, category, is_published, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) { console.error('[admin-notice PUT]', error); return NextResponse.json({ error: '수정 실패' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

// 삭제
export async function DELETE(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });

  const adminSupabase = getAdminSupabase();
  const { error } = await adminSupabase.from('notices').delete().eq('id', id);
  if (error) { console.error('[admin-notice DELETE]', error); return NextResponse.json({ error: '삭제 실패' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
