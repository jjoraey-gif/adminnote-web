import { createServerSupabase } from '@/lib/supabase-server';
import NoticeManager from './NoticeManager';

export default async function NoticesPage() {
  const supabase = await createServerSupabase();
  const { data: notices } = await supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
      </div>
      <NoticeManager initialNotices={notices ?? []} />
    </div>
  );
}
