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

  const nowIso = new Date().toISOString();

  const [{ data: photoRows, error }, { data: profiles }, { data: authData }] = await Promise.all([
    adminSupabase
      .from('photo_transfers')
      .select('id, user_id, file_path, thumb_path, file_name, file_size, expires_at, created_at, deleted_at')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(limit),
    adminSupabase.from('profiles').select('id, nickname, org_name'),
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) {
    console.error('[admin-photos]', error);
    return NextResponse.json({ error: '파일 목록을 불러올 수 없습니다.' }, { status: 500 });
  }

  const rows = photoRows ?? [];

  const emailMap: Record<string, string> = {};
  (authData?.users ?? []).forEach((u: any) => { if (u.email) emailMap[u.id] = u.email; });

  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  // 삭제되지 않은 파일에만 URL을 발급한다 (삭제된 건 썸네일을 띄우지 않으므로 불필요).
  // 그리드에는 업로드 시 저장해 둔 thumb_path(축소 이미지)를 쓰고, 원본은 확대 보기에만 쓴다.
  // 무료 플랜에서는 Storage 이미지 변환(transform)이 동작하지 않으므로 transform 옵션은 쓰지 않는다.
  const activePhotos = rows.filter(p => !p.deleted_at);
  const urlMap: Record<string, string> = {};

  if (activePhotos.length > 0) {
    const paths = [
      ...activePhotos.map(p => p.file_path),
      ...activePhotos.map(p => p.thumb_path).filter((p): p is string => !!p),
    ];
    const { data: urls } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);
    (urls ?? []).forEach(u => { if (u.signedUrl && u.path) urlMap[u.path] = u.signedUrl; });
  }

  const photos = rows.map(p => {
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
      thumbUrl,
      fullUrl,
      uploaderEmail: emailMap[p.user_id] ?? '-',
      uploaderName: prof?.nickname ?? prof?.org_name ?? '-',
    };
  });

  return NextResponse.json({ photos, limit });
}
