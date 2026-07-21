import { createServerSupabase } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  // 공지사항 수
  const { count: noticeCount } = await supabase
    .from('notices')
    .select('*', { count: 'exact', head: true });

  // 전체 유저 수 (auth.users는 service_role 필요 — 여기선 placeholder)
  const stats = [
    { label: '전체 공지사항', value: noticeCount ?? 0, unit: '개' },
    { label: '업데이트 공지', value: '-', unit: '' },
    { label: '이용안내', value: '-', unit: '' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900">
              {s.value}<span className="text-base font-normal text-gray-400 ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 빠른 링크 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">바로가기</h2>
        <div className="flex flex-col gap-3">
          <a href="/dashboard/notices" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors">
            <span className="text-lg">📢</span> 공지사항 관리
          </a>
          <a href="/dashboard/users" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors">
            <span className="text-lg">👥</span> 사용자 목록
          </a>
        </div>
      </div>
    </div>
  );
}
