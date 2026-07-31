import { createClient } from '@supabase/supabase-js';
import AdminLoginPage from './LoginPage';
import AdminDashboard from './Dashboard';
import { isAdminAuthed } from '@/lib/admin-auth';

// 캐시 완전 비활성화 — 항상 최신 데이터
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET = 'photo-transfers';

async function getAdminData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    console.error('[Admin] SUPABASE_SERVICE_ROLE_KEY 환경변수 없음');
  }

  const adminSupabase = createClient(supabaseUrl, serviceKey);

  // KST(UTC+9) 기준 오늘 자정 → UTC로 변환
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstMidnight = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));
  const todayStart = new Date(kstMidnight.getTime() - kstOffset);
  const todayDateStr = kstMidnight.toISOString().slice(0, 10); // site_visits.visit_date 와 동일한 KST 기준 날짜 문자열

  // ── 모든 독립 쿼리를 병렬 실행 ──
  const [
    { data: listData, error: listError },
    { data: profiles, error: profilesError },
    { count: todayPhotoCount },
    { data: noticeRows },
    { data: suggestionRows },
    { data: versionRows },
    { data: photoRows },
    { count: totalVisitCount },
    { count: todayVisitCount },
  ] = await Promise.all([
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
    adminSupabase.from('profiles').select('*'),
    adminSupabase.from('photo_transfers').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    adminSupabase.from('notices').select('id, title, content, category, is_published, created_at').order('created_at', { ascending: false }),
    adminSupabase.from('suggestions').select('id, user_email, user_nickname, content, is_read, created_at').order('created_at', { ascending: false }).limit(200),
    adminSupabase.from('app_versions').select('platform, version, force_update, message, store_url, updated_at'),
    adminSupabase.from('photo_transfers').select('*').order('created_at', { ascending: false }).limit(200),
    adminSupabase.from('site_visits').select('*', { count: 'exact', head: true }),
    adminSupabase.from('site_visits').select('*', { count: 'exact', head: true }).eq('visit_date', todayDateStr),
  ]);

  const authUsers = listData?.users ?? [];
  const notices = noticeRows ?? [];
  const suggestions = suggestionRows ?? [];

  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  // DB 컬럼명은 `version`, UI에서는 `min_version`으로 다룸
  const versionMap: Record<string, any> = {};
  (versionRows ?? []).forEach((r: any) => {
    versionMap[r.platform] = { ...r, min_version: r.version };
  });
  const appVersions = {
    ios: versionMap['ios'] ?? { platform: 'ios', min_version: '1.0.0', force_update: false, message: '' },
    android: versionMap['android'] ?? { platform: 'android', min_version: '1.0.0', force_update: false, message: '' },
  };

  // ── user_snapshots fallback (listUsers 실패 시) ──
  let users = authUsers;
  let usingFallback = false;

  if (users.length === 0) {
    usingFallback = true;
    const { data: snapshots } = await adminSupabase
      .from('user_snapshots')
      .select('user_id, updated_at')
      .order('updated_at', { ascending: false });

    const seen = new Set<string>();
    const syntheticUsers: any[] = [];

    (profiles ?? []).forEach((p: any) => {
      seen.add(p.id);
      syntheticUsers.push({
        id: p.id,
        email: p.email ?? null,
        created_at: p.created_at ?? new Date().toISOString(),
        app_metadata: { provider: 'email' },
      });
    });

    (snapshots ?? []).forEach((s: any) => {
      if (!seen.has(s.user_id)) {
        seen.add(s.user_id);
        syntheticUsers.push({
          id: s.user_id,
          email: null,
          created_at: s.updated_at,
          app_metadata: { provider: 'unknown' },
        });
      }
    });

    users = syntheticUsers;
  }

  const userMap: Record<string, any> = {};
  users.forEach(u => { userMap[u.id] = u; });

  const personal = users
    .filter(u => (profileMap[u.id]?.account_type === 'personal') || (!profileMap[u.id] && !usingFallback))
    .map(u => ({
      id: u.id,
      email: u.email ?? profileMap[u.id]?.email ?? '-',
      nickname: profileMap[u.id]?.nickname ?? '-',
      provider: u.app_metadata?.provider ?? 'email',
      createdAt: u.created_at,
      grade: profileMap[u.id]?.grade ?? 'normal',
    }));

  const shared = users
    .filter(u => profileMap[u.id]?.account_type === 'shared')
    .map(u => ({
      id: u.id,
      email: u.email ?? profileMap[u.id]?.email ?? '-',
      orgName: profileMap[u.id]?.org_name ?? '-',
      userId: profileMap[u.id]?.user_id ?? '-',
      createdAt: u.created_at,
    }));

  // ── 사진 signed URL 생성 ──
  const validPhotos = (photoRows ?? []).filter((p: any) => new Date(p.expires_at) > new Date());
  let photos: any[] = [];

  if (validPhotos.length > 0) {
    const activePhotos = validPhotos.filter((p: any) => !p.deleted_at);
    const [thumbResults, fullResults] = await Promise.all([
      Promise.all(
        activePhotos.map((p: any) =>
          adminSupabase.storage.from(BUCKET).createSignedUrl(p.file_path, 3600, {
            transform: { width: 300, height: 300, resize: 'cover', quality: 70 },
          }).then(({ data }) => ({ path: p.file_path, url: data?.signedUrl ?? '' }))
        )
      ),
      Promise.all(
        activePhotos.map((p: any) =>
          adminSupabase.storage.from(BUCKET).createSignedUrl(p.file_path, 3600)
            .then(({ data }) => ({ path: p.file_path, url: data?.signedUrl ?? '' }))
        )
      ),
    ]);

    const thumbMap: Record<string, string> = {};
    thumbResults.forEach(r => { thumbMap[r.path] = r.url; });
    const fullMap: Record<string, string> = {};
    fullResults.forEach(r => { fullMap[r.path] = r.url; });

    photos = validPhotos.map((p: any) => {
      const u = userMap[p.user_id];
      const prof = profileMap[p.user_id];
      return {
        id: p.id,
        filePath: p.file_path,
        fileName: p.file_name,
        fileSize: p.file_size,
        expiresAt: p.expires_at,
        createdAt: p.created_at,
        deletedAt: p.deleted_at ?? null,
        thumbUrl: thumbMap[p.file_path] ?? '',
        fullUrl: fullMap[p.file_path] ?? '',
        uploaderEmail: u?.email ?? '-',
        uploaderName: prof?.nickname ?? prof?.org_name ?? '-',
      };
    });
  }

  return {
    total: users.length,
    personalCount: personal.length,
    sharedCount: shared.length,
    todayUsers: users.filter(u => new Date(u.created_at) >= todayStart).length,
    photoCount: validPhotos.length,
    todayPhotoCount: todayPhotoCount ?? 0,
    totalVisits: totalVisitCount ?? 0,
    todayVisits: todayVisitCount ?? 0,
    personal,
    shared,
    photos,
    usingFallback,
    listError: listError?.message ?? null,
    profilesError: profilesError?.message ?? null,
    profilesCount: (profiles ?? []).length,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    appVersions,
    notices,
    suggestions,
  };
}

export default async function AdminPage() {
  if (!await isAdminAuthed()) {
    return <AdminLoginPage />;
  }

  const data = await getAdminData();
  // sessionToken은 절대 클라이언트로 전달하지 않는다 (RSC 페이로드에 평문 노출됨).
  // 모든 admin API는 httpOnly 쿠키(path: '/')로 인증한다.
  return <AdminDashboard data={data} />;
}
