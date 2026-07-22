import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

const ADMIN_EMAIL = 'jjoraey@gmail.com';

async function getAdminData() {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 전체 유저 목록
  const { data: { users }, error } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !users) return null;

  // profiles 테이블 (기관명, 아이디 등)
  const { data: profiles } = await adminSupabase.from('profiles').select('*');
  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach(p => { profileMap[p.id] = p; });

  // 사진전송 건수
  const { count: photoCount } = await adminSupabase
    .from('photo_transfers')
    .select('*', { count: 'exact', head: true });

  // 오늘 가입자
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayUsers = users.filter(u => new Date(u.created_at) >= todayStart).length;

  const personal = users
    .filter(u => {
      const p = profileMap[u.id];
      return p?.account_type === 'personal' || (!p && !u.email?.endsWith('@kakao.local'));
    })
    .map(u => ({
      id: u.id,
      email: u.email ?? '-',
      nickname: profileMap[u.id]?.nickname ?? '-',
      provider: u.app_metadata?.provider ?? 'email',
      createdAt: u.created_at,
    }));

  const shared = users
    .filter(u => profileMap[u.id]?.account_type === 'shared')
    .map(u => ({
      id: u.id,
      email: u.email ?? '-',
      orgName: profileMap[u.id]?.org_name ?? '-',
      userId: profileMap[u.id]?.user_id ?? '-',
      createdAt: u.created_at,
    }));

  return {
    total: users.length,
    personalCount: personal.length,
    sharedCount: shared.length,
    todayUsers,
    photoCount: photoCount ?? 0,
    personal,
    shared,
  };
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function providerBadge(provider: string) {
  const map: Record<string, { label: string; color: string }> = {
    email: { label: '이메일', color: '#2563EB' },
    google: { label: 'Google', color: '#EA4335' },
    apple: { label: 'Apple', color: '#1C1C1E' },
    kakao: { label: '카카오', color: '#F7E600' },
  };
  const { label, color } = map[provider] ?? { label: provider, color: '#9CA3AF' };
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 99,
      background: color, color: provider === 'kakao' ? '#1C1C1E' : '#fff',
    }}>{label}</span>
  );
}

export default async function AdminPage() {
  // 세션 확인
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect('/');

  const data = await getAdminData();
  if (!data) return <div style={{ padding: 40, color: 'red' }}>데이터 로딩 실패</div>;

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 16, padding: '24px 28px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #F3F4F6',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 12,
    fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #F9FAFB', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
            <span style={{ color: '#2563EB' }}>Admin</span>
            <span style={{ color: '#1C1C1E' }}>Note</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#9CA3AF', marginLeft: 12 }}>관리자</span>
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: '총 회원수', value: data.total, color: '#2563EB' },
            { label: '개인회원', value: data.personalCount, color: '#16A34A' },
            { label: '공용폰', value: data.sharedCount, color: '#9333EA' },
            { label: '오늘 가입', value: data.todayUsers, color: '#F59E0B' },
            { label: '사진전송 건수', value: data.photoCount, color: '#EF4444' },
          ].map(({ label, value, color }) => (
            <div key={label} style={cardStyle}>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 개인회원 테이블 */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1C1C1E' }}>
            개인회원 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.personalCount}명</span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>이메일</th>
                  <th style={thStyle}>닉네임</th>
                  <th style={thStyle}>로그인 방식</th>
                  <th style={thStyle}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {data.personal.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>없음</td></tr>
                ) : data.personal.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...tdStyle, color: '#9CA3AF' }}>{i + 1}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>{u.nickname}</td>
                    <td style={tdStyle}>{providerBadge(u.provider)}</td>
                    <td style={{ ...tdStyle, color: '#9CA3AF' }}>{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 공용폰 테이블 */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1C1C1E' }}>
            공용폰 회원 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.sharedCount}명</span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>기관명</th>
                  <th style={thStyle}>아이디</th>
                  <th style={thStyle}>이메일</th>
                  <th style={thStyle}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {data.shared.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>없음</td></tr>
                ) : data.shared.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...tdStyle, color: '#9CA3AF' }}>{i + 1}</td>
                    <td style={tdStyle}>{u.orgName}</td>
                    <td style={tdStyle}>{u.userId}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={{ ...tdStyle, color: '#9CA3AF' }}>{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
