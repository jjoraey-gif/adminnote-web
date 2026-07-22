import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import AdminLoginPage from './LoginPage';
import AdminDashboard from './Dashboard';

const SESSION_COOKIE = 'an_admin_auth';

async function getAdminData() {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { users } } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
  const { data: profiles } = await adminSupabase.from('profiles').select('*');
  const { count: photoCount } = await adminSupabase
    .from('photo_transfers').select('*', { count: 'exact', head: true });

  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach(p => { profileMap[p.id] = p; });

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

  return {
    total: allUsers.length,
    personalCount: personal.length,
    sharedCount: shared.length,
    todayUsers: allUsers.filter(u => new Date(u.created_at) >= todayStart).length,
    photoCount: photoCount ?? 0,
    personal,
    shared,
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
