import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeEqual } from '@/lib/admin-auth';

// 매일 자정 실행 — 만료된 사진 정리
export async function GET(request: Request) {
  // CRON_SECRET 미설정 시 무조건 거부 (설정 누락으로 인한 인증 우회 방지)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cleanup-photos] CRON_SECRET 환경변수 미설정');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Vercel Cron 보안 헤더 검증 (상수 시간 비교)
  const authHeader = request.headers.get('authorization');
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 만료된 레코드 조회
  const { data: expired, error } = await adminSupabase
    .from('photo_transfers')
    .select('id, file_path, thumb_path')
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[cleanup-photos] DB 조회 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0, message: '삭제할 항목 없음' });
  }

  // Storage에서 파일 삭제 — 원본 + 썸네일
  const filePaths = expired.flatMap(r => r.thumb_path ? [r.file_path, r.thumb_path] : [r.file_path]);
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
