import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

const BUCKET = 'photo-transfers';

// 한 번에 불러올 최대 건수. 예전에는 페이지 로드마다 200건을 무조건 가져와
// signed URL 400개를 만들고 원본 이미지를 전부 내려받아 Egress를 크게 소모했다.
const MAX_LIMIT = 60;

/**
 * 관리자용 전송 파일 목록 — 요청 시에만 조회한다.
 * 이미지 URL은 실제로 보여줄 건수에 대해서만 발급한다.
 */
export async function GET(request: NextRequest) {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_LIMIT)
    : MAX_LIMIT;

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = Date.now();

  // 유저가 삭제한 파일도 삭제 시점으로부터 3일간은 관리자가 조회할 수 있어야 하므로
  // expires_at 기준으로 미리 걸러내지 않고 최근 생성 순으로 가져온 뒤 아래에서 직접 판별한다.
  const [{ data: photoRows, error }, { data: profiles }, { data: authData }] = await Promise.all([
    adminSupabase
      .from('photo_transfers')
      .select('id, user_id, file_path, thumb_path, file_name, file_size, expires_at, created_at, deleted_at, admin_seen_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    adminSupabase.from('profiles').select('id, nickname, org_name'),
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) {
    console.error('[admin-photos]', error);
    return NextResponse.json({ error: '파일 목록을 불러올 수 없습니다.' }, { status: 500 });
  }

  // 유저 삭제 후 관리자에게 계속 보여줄 그레이스 기간 (서버 크론의 영구 삭제 유예와 동일해야 함)
  const DELETE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

  // 삭제 안 된 파일은 원래 만료(expires_at) 전까지, 삭제된 파일은 삭제 후 3일간 조회 가능
  const visibleRows = (photoRows ?? []).filter(p => {
    if (p.deleted_at) return now - new Date(p.deleted_at).getTime() < DELETE_GRACE_MS;
    return new Date(p.expires_at).getTime() > now;
  });

  const emailMap: Record<string, string> = {};
  (authData?.users ?? []).forEach((u: any) => { if (u.email) emailMap[u.id] = u.email; });

  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  // 화면에 표시할 대상(삭제 후 그레이스 기간 내 포함) 전체에 대해 URL을 발급한다.
  // 그리드에는 업로드 시 저장해 둔 thumb_path(축소 이미지)를 쓰고, 원본은 확대 보기에만 쓴다.
  // 무료 플랜에서는 Storage 이미지 변환(transform)이 동작하지 않으므로 transform 옵션은 쓰지 않는다.
  const urlMap: Record<string, string> = {};

  if (visibleRows.length > 0) {
    const paths = [
      ...visibleRows.map(p => p.file_path),
      ...visibleRows.map(p => p.thumb_path).filter((p): p is string => !!p),
    ];
    const { data: urls } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);
    (urls ?? []).forEach(u => { if (u.signedUrl && u.path) urlMap[u.path] = u.signedUrl; });
  }

  // "확인함" 여부는 기기/브라우저가 아니라 서버(DB)에 저장해서 어느 컴퓨터에서 봐도 동일하게 유지한다.
  const photos = visibleRows.map(p => {
    const prof = profileMap[p.user_id];
    const fullUrl = urlMap[p.file_path] ?? '';
    // 썸네일이 없는 항목(문서 / 구버전 업로드)은 원본으로 폴백
    const thumbUrl = (p.thumb_path ? urlMap[p.thumb_path] : '') || fullUrl;
    return {
      id: p.id,
      filePath: p.file_path,
      fileName: p.file_name,
      fileSize: p.file_size,
      expiresAt: p.expires_at,
      createdAt: p.created_at,
      deletedAt: p.deleted_at ?? null,
      isNew: !p.admin_seen_at,
      thumbUrl,
      fullUrl,
      uploaderEmail: emailMap[p.user_id] ?? '-',
      uploaderName: prof?.nickname ?? prof?.org_name ?? '-',
    };
  });

  // 이번에 응답으로 내려준 것 중 처음 확인하는 항목들을 "확인함"으로 서버에 기록한다.
  const newlySeenIds = visibleRows.filter(p => !p.admin_seen_at).map(p => p.id);
  if (newlySeenIds.length > 0) {
    const { error: markErr } = await adminSupabase
      .from('photo_transfers')
      .update({ admin_seen_at: new Date().toISOString() })
      .in('id', newlySeenIds);
    if (markErr) console.error('[admin-photos] 확인 기록 저장 실패:', markErr);
  }

  return NextResponse.json({ photos, limit });
}
