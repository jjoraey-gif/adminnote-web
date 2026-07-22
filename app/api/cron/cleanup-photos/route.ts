import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 매일 자정 실행 — 만료된 사진 정리
export async function GET(request: Request) {
  // Vercel Cron 보안 헤더 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 만료된 레코드 조회
  const { data: expired, error } = await adminSupabase
    .from('photo_transfers')
    .select('id, file_path')
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[cleanup-photos] DB 조회 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0, message: '삭제할 항목 없음' });
  }

  // Storage에서 파일 삭제
  const filePaths = expired.map(r => r.file_path);
  const { error: storageErr } = await adminSupabase.storage
    .from('photo-transfers')
    .remove(filePaths);

  if (storageErr) {
    console.error('[cleanup-photos] Storage 삭제 실패:', storageErr);
  }

  // DB 레코드 삭제
  const ids = expired.map(r => r.id);
  const { error: dbErr } = await adminSupabase
    .from('photo_transfers')
    .delete()
    .in('id', ids);

  if (dbErr) {
    console.error('[cleanup-photos] DB 삭제 실패:', dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  console.log(`[cleanup-photos] ${expired.length}개 사진 삭제 완료`);
  return NextResponse.json({ deleted: expired.length });
}
