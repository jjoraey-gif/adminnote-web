'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Notice {
  id: string;
  category: '업데이트' | '이용안내';
  title: string;
  content: string;
  created_at: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  업데이트: 'bg-blue-100 text-blue-700',
  이용안내: 'bg-green-100 text-green-700',
};

export default function NoticeManager({ initialNotices }: { initialNotices: Notice[] }) {
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '이용안내' as Notice['category'], title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('notices')
      .insert({ category: form.category, title: form.title, content: form.content })
      .select()
      .single();

    if (!error && data) {
      setNotices([data, ...notices]);
      setForm({ category: '이용안내', title: '', content: '' });
      setShowForm(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) setNotices(notices.filter((n) => n.id !== id));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div>
      {/* 새 공지 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '취소' : '+ 새 공지사항'}
        </button>
      </div>

      {/* 작성 폼 */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">새 공지사항 작성</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Notice['category'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
              >
                <option value="이용안내">이용안내</option>
                <option value="업데이트">업데이트</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="공지사항 제목"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="공지 내용을 입력하세요"
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? '저장 중...' : '게시하기'}
            </button>
          </div>
        </form>
      )}

      {/* 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {notices.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">공지사항이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500 w-24">카테고리</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">제목</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 w-28">날짜</th>
                <th className="px-6 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {notices.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${CATEGORY_COLOR[n.category]}`}>
                      {n.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{n.title}</td>
                  <td className="px-6 py-4 text-gray-400">{formatDate(n.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-red-400 hover:text-red-600 transition-colors text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
