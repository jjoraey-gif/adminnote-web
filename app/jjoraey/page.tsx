import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import AdminLoginPage from './LoginPage';
import AdminDashboard from './Dashboard';

// 캐시 완전 비활성화 — 항상 최신 데이터
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SESSION_COOKIE = 'an_admin_auth';
const BUCKET = 'photo-transfers';

async function getAdminData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    console.error('[Admin] SUPABASE_SERVICE_ROLE_KEY 환경변수 없음');
  }

  const adminSupabase = createClient(supabaseUrl, serviceKey);

  // ── 1. auth.admin.listUsers (서비스 롤 키 필요) ──
  const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = listData?.users ?? [];

  // ── 2. profiles 테이블 ──
  const { data: profiles, error: profilesError } = await adminSupabase.from('profiles').select('*');

  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  // ── 3. user_snapshots로 보완 (listUsers 실패 시 fallback) ──
  let users = authUsers;
  let usingFallback = false;

  if (users.length === 0) {
    // listUsers 실패 → profiles + user_snapshots 기반으로 재구성
    usingFallback = true;
    const { data: snapshots } = await adminSupabase
      .from('user_snapshots')
      .select('user_id, updated_at')
      .order('updated_at', { ascending: false });

    const seen = new Set<string>();
    const syntheticUsers: any[] = [];

    // profiles 기반
    (profiles ?? []).forEach((p: any) => {
      seen.add(p.id);
      syntheticUsers.push({
        id: p.id,
        email: p.email ?? null,
        created_at: p.created_at ?? new Date().toISOString(),
        app_metadata: { provider: 'email' },
      });
    });

    // snapshots 기반 (profiles에 없는 유저)
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

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const personal = users
    .filter(u => (profileMap[u.id]?.account_type === 'personal') || (!profileMap[u.id] && !usingFallback))
    .map(u => ({
      id: u.id,
      email: u.email ?? profileMap[u.id]?.email ?? '-',
      nickname: profileMap[u.id]?.nickname ?? '-',
      provider: u.app_metadata?.provider ?? 'email',
      createdAt: u.created_at,
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

  // ── 4. 사진 목록 ──
  const { data: photoRows } = await adminSupabase
    .from('photo_transfers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

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
    personal,
    shared,
    photos,
    usingFallback,
    listError: listError?.message ?? null,
    profilesError: profilesError?.message ?? null,
    profilesCount: (profiles ?? []).length,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const isAuthed = token === (process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok');

  if (!isAuthed) {
    return <AdminLoginPage />;
  }

  const data = await getAdminData();
  return <AdminDashboard data={data} />;
}
