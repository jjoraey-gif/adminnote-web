'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useWebStore } from '@/lib/useWebStore';
import ScheduleView from './ScheduleView';
import TodoView from './TodoView';
import BudgetView from './BudgetView';

const TABS = [
  { key: 'schedule', label: '업무일정' },
  { key: 'todo', label: '오늘 할 일' },
  { key: 'budget', label: '예산관리' },
  { key: 'history', label: '이력관리' },
  { key: 'promotion', label: '승진순위 관리' },
  { key: 'org', label: '부서조직도' },
  { key: 'contacts', label: '외부연락처' },
];

interface Props {
  user: User;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('schedule');
  const supabase = createClient();
  const store = useWebStore(user.id);

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.user_metadata?.nickname ??
    user.email?.split('@')[0] ??
    '사용자';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <header style={{
        borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
          <span style={{ color: '#2563EB' }}>Admin</span>
          <span style={{ color: '#1C1C1E' }}>Note</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{displayName}</span>
          <button onClick={handleLogout} style={{
            fontSize: 13, fontWeight: 500, color: '#6B7280',
            padding: '6px 14px', borderRadius: 20, border: '1px solid #E5E7EB',
            background: '#fff', cursor: 'pointer',
          }}>로그아웃</button>
        </div>
      </header>

      {/* 탭 바 */}
      <div style={{
        borderBottom: '1px solid #E5E7EB', padding: '0 32px',
        display: 'flex', background: '#fff', overflowX: 'auto',
        position: 'sticky', top: 56, zIndex: 40,
      }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '14px 20px', fontSize: 14,
            fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#2563EB' : '#6B7280',
            background: 'none', border: 'none',
            borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
            cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1, transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <main style={{ flex: 1, padding: '32px' }}>
        {store.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: '#9CA3AF', fontSize: 14 }}>
            데이터 불러오는 중...
          </div>
        ) : (
          <>
            {activeTab === 'schedule' && (
              <ScheduleView
                events={store.events}
                onAdd={store.addEvent}
                onUpdate={store.updateEvent}
                onDelete={store.deleteEvent}
                onToggle={store.toggleEvent}
              />
            )}
            {activeTab === 'todo' && (
              <TodoView
                todos={store.todos}
                onAdd={store.addTodo}
                onToggle={store.toggleTodo}
                onDelete={store.deleteTodo}
              />
            )}
            {activeTab === 'budget' && (
              <BudgetView
                subProjects={store.subProjects}
                onUpdateSpent={store.updateSpent}
              />
            )}
            {activeTab === 'history' && <ComingSoon label="이력관리" desc="업무 처리 이력을 조회하고 기록합니다." />}
            {activeTab === 'promotion' && <ComingSoon label="승진순위 관리" desc="승진 대상자 및 순위를 관리합니다." />}
            {activeTab === 'org' && <ComingSoon label="부서조직도" desc="부서 구성 및 조직도를 확인합니다." />}
            {activeTab === 'contacts' && <ComingSoon label="외부연락처" desc="외부 기관 및 업체 연락처를 관리합니다." />}
          </>
        )}
      </main>

      {/* 푸터 */}
      <footer style={{ borderTop: '1px solid #E5E7EB', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>© 2026 AdminNote</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/terms" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>이용약관</Link>
          <Link href="/privacy" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>개인정보처리방침</Link>
        </div>
      </footer>
    </div>
  );
}

function ComingSoon({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 10 }}>
      <div style={{ fontSize: 36 }}>🚧</div>
      <p style={{ fontSize: 17, fontWeight: 600, color: '#374151', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>{desc}</p>
      <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, marginTop: 4 }}>준비 중입니다.</p>
    </div>
  );
}
