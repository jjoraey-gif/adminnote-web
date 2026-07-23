import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import AdminLoginPage from './LoginPage';
import AdminDashboard from './Dashboard';

const SESSION_COOKIE = 'an_admin_auth';
const BUCKET = 'photo-transfers';

async function getAdminData() {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error('[Admin] listUsers 오류:', listError.message, listError.status);
  }
  const users = listData?.users ?? [];

  const { data: profiles, error: profilesError } = await adminSupabase.from('profiles').select('*');
  if (profilesError) {
    console.error('[Admin] profiles 쿼리 오류:', profilesError.message);
  }
  const { data: photoRows } = await adminSupabase
    .from('photo_transfers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach(p => { profileMap[p.id] = p; });

  const userMap: Record<string, any> = {};
  (users ?? []).forEach(u => { userMap[u.id] = u; });

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const allUsers = users ?? [];

  const personal = allUsers
    .filter(u => (profileMap[u.id]?.account_type === 'personal') || (!profileMap[u.id]))
    .map(u => ({
      id: u.id,
      email: u.email ?? '-',
      nickname: profileMap[u.id]?.nickname ?? '-',
      provider: u.app_metadata?.provider ?? 'email',
      createdAt: u.created_at,
    }));

  const shared = allUsers
    .filter(u => profileMap[u.id]?.account_type === 'shared')
    .map(u => ({
      id: u.id,
      email: u.email ?? '-',
      orgName: profileMap[u.id]?.org_name ?? '-',
      userId: profileMap[u.id]?.user_id ?? '-',
      createdAt: u.created_at,
    }));

  // 사진 목록 + 썸네일/풀사이즈 signed URL (만료 안된 것 전체 — 삭제된 것 포함)
  const validPhotos = (photoRows ?? []).filter(p => new Date(p.expires_at) > new Date());
  let photos: any[] = [];
  if (validPhotos.length > 0) {
    // 삭제 안 된 파일만 signed URL 생성 (삭제된 파일은 Storage에 없음)
    const activePhotos = validPhotos.filter(p => !p.deleted_at);
    const [thumbResults, fullResults] = await Promise.all([
      Promise.all(
        activePhotos.map(p =>
          adminSupabase.storage.from(BUCKET).createSignedUrl(p.file_path, 3600, {
            transform: { width: 300, height: 300, resize: 'cover', quality: 70 },
          }).then(({ data }) => ({ path: p.file_path, url: data?.signedUrl ?? '' }))
        )
      ),
      Promise.all(
        activePhotos.map(p =>
          adminSupabase.storage.from(BUCKET).createSignedUrl(p.file_path, 3600)
            .then(({ data }) => ({ path: p.file_path, url: data?.signedUrl ?? '' }))
        )
      ),
    ]);

    const thumbMap: Record<string, string> = {};
    thumbResults.forEach(r => { thumbMap[r.path] = r.url; });
    const fullMap: Record<string, string> = {};
    fullResults.forEach(r => { fullMap[r.path] = r.url; });

    photos = validPhotos.map(p => {
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
    total: allUsers.length,
    personalCount: personal.length,
    sharedCount: shared.length,
    todayUsers: allUsers.filter(u => new Date(u.created_at) >= todayStart).length,
    photoCount: validPhotos.length,
    personal,
    shared,
    photos,
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
