import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// 읽음 토글
export async function PATCH(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, is_read } = await request.json();
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (typeof is_read !== 'boolean') return NextResponse.json({ error: 'is_read must be boolean' }, { status: 400 });

  const adminSupabase = getAdminSupabase();
  const { error } = await adminSupabase
    .from('suggestions')
    .update({ is_read })
    .eq('id', id);

  if (error) { console.error('[admin-suggestion PATCH]', error); return NextResponse.json({ error: '수정 실패' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

// 삭제
export async function DELETE(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });

  const adminSupabase = getAdminSupabase();
  const { error } = await adminSupabase.from('suggestions').delete().eq('id', id);
  if (error) { console.error('[admin-suggestion DELETE]', error); return NextResponse.json({ error: '삭제 실패' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
