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

  const nowIso = new Date().toISOString();
  // 유저가 삭제한 파일은 관리자 조회를 위해 3일간 유예를 준다 (admin-photos API의 그레이스 기간과 동일해야 함)
  const DELETE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
  const deleteGraceThresholdIso = new Date(Date.now() - DELETE_GRACE_MS).toISOString();

  // 정리 대상 후보 조회: 자연 만료(expires_at 경과) 또는 유저가 삭제한(deleted_at) 레코드
  const { data: candidates, error } = await adminSupabase
    .from('photo_transfers')
    .select('id, file_path, thumb_path, expires_at, deleted_at')
    .or(`expires_at.lt.${nowIso},deleted_at.not.is.null`);

  if (error) {
    console.error('[cleanup-photos] DB 조회 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 실제 영구 삭제 대상 판별
  // - 유저가 삭제한 경우: 삭제 후 3일이 지나야 영구 삭제 (그 전에는 관리자가 조회 가능해야 함)
  // - 유저가 삭제하지 않은 경우: 원래 만료 시각(expires_at)이 지나면 삭제
  const expired = (candidates ?? []).filter(r => {
    if (r.deleted_at) return r.deleted_at < deleteGraceThresholdIso;
    return r.expires_at < nowIso;
  });

  if (expired.length === 0) {
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
