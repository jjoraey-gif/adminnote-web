'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', emoji: '🏠' },
  { href: '/dashboard/notices', label: '공지사항', emoji: '📢' },
  { href: '/dashboard/users', label: '사용자', emoji: '👥' },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col py-6 px-4 shrink-0">
      {/* 로고 */}
      <Link href="/" className="text-lg font-bold mb-8 px-2">
        <span className="text-blue-600">Admin</span>
        <span className="text-gray-900">Note</span>
      </Link>

      {/* 메뉴 */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 로그아웃 */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors mt-2"
      >
        <span>↩</span> 로그아웃
      </button>
    </aside>
  );
}
