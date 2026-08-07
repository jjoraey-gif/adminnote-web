import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';

/**
 * 관리자가 "확인함"으로 기록한 사진 표시를 전체 초기화한다.
 * 서버(DB)에 저장되므로 어떤 컴퓨터/브라우저에서 호출해도 동일하게 적용된다.
 * POST /api/admin-reset-seen-photos
 */
export async function POST() {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminSupabase
    .from('photo_transfers')
    .update({ admin_seen_at: null })
    .not('admin_seen_at', 'is', null);

  if (error) {
    console.error('[admin-reset-seen-photos]', error);
    return NextResponse.json({ error: '초기화에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
