import { createClient } from '@supabase/supabase-js';
import AdminLoginPage from './LoginPage';
import AdminDashboard from './Dashboard';
import { isAdminAuthed } from '@/lib/admin-auth';

// 캐시 완전 비활성화 — 항상 최신 데이터
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    { count: validPhotoCount },
    { count: totalVisitCount },
    { count: todayVisitCount },
  ] = await Promise.all([
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
    adminSupabase.from('profiles').select('*'),
    adminSupabase.from('photo_transfers').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    adminSupabase.from('notices').select('id, title, content, category, is_published, created_at').order('created_at', { ascending: false }),
    adminSupabase.from('suggestions').select('id, user_email, user_nickname, content, is_read, created_at').order('created_at', { ascending: false }).limit(200),
    adminSupabase.from('app_versions').select('platform, version, force_update, message, store_url, updated_at'),
    // 사진은 개수만 집계한다. 실제 목록/이미지 URL은 관리자가 "불러오기"를 누를 때
    // /api/admin-photos 에서 필요한 만큼만 가져온다 (Egress 절감 — 예전에는 페이지를
    // 열 때마다 200건에 대해 signed URL 400개를 만들고 원본 이미지를 전부 내려받았음).
    adminSupabase.from('photo_transfers').select('*', { count: 'exact', head: true }).gt('expires_at', now.toISOString()),
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

  // 번호(#)는 가입일 오름차순 기준으로 고정 부여 (먼저 가입한 사람이 낮은 번호),
  // 화면에는 최신 가입자가 먼저 보이도록 번호 부여 후 다시 최신순으로 뒤집는다.
  const personal = users
    .filter(u => (profileMap[u.id]?.account_type === 'personal') || (!profileMap[u.id] && !usingFallback))
    .map(u => ({
      id: u.id,
      email: u.email ?? profileMap[u.id]?.email ?? '-',
      nickname: profileMap[u.id]?.nickname ?? '-',
      provider: u.app_metadata?.provider ?? 'email',
      createdAt: u.created_at,
      grade: profileMap[u.id]?.grade ?? 'normal',
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((u, i) => ({ ...u, no: i + 1 }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const shared = users
    .filter(u => profileMap[u.id]?.account_type === 'shared')
    .map(u => ({
      id: u.id,
      email: u.email ?? profileMap[u.id]?.email ?? '-',
      orgName: profileMap[u.id]?.org_name ?? '-',
      userId: profileMap[u.id]?.user_id ?? '-',
      createdAt: u.created_at,
    }));

  // 사진 목록은 페이지 로드 시 만들지 않는다 (Egress 절감).
  // Dashboard의 "전송된 파일" 섹션에서 불러오기를 누르면 /api/admin-photos 가 처리한다.
  const photos: any[] = [];

  return {
    total: users.length,
    personalCount: personal.length,
    sharedCount: shared.length,
    todayUsers: users.filter(u => new Date(u.created_at) >= todayStart).length,
    photoCount: validPhotoCount ?? 0,
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
