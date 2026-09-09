import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';

/** 비밀번호 초기화 요청 처리 (관리자 전용) */

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** 처리완료 / 미처리 토글. PATCH { id, done } */
export async function PATCH(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, done } = await request.json();
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await adminClient()
    .from('password_reset_requests')
    .update({
      status: done ? 'done' : 'pending',
      handled_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    console.error('[admin-reset-requests] 상태 변경 실패:', error);
    return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** 요청 삭제. DELETE { id } */
export async function DELETE(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await adminClient()
    .from('password_reset_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[admin-reset-requests] 삭제 실패:', error);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
