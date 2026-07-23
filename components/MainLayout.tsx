'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useWebStore } from '@/lib/useWebStore';
import ScheduleView from './ScheduleView';
import TodoView from './TodoView';
import BudgetView from './BudgetView';
import PhotoTransferView from './PhotoTransferView';
import AppIntroView from './AppIntroView';
import ExternalContactView from './ExternalContactView';

const TABS = [
  { key: 'photo', label: '파일전송', disabled: false },
  { key: 'schedule', label: '업무일정', disabled: false },
  { key: 'todo', label: '오늘 할 일', disabled: false },
  { key: 'budget', label: '예산관리', disabled: false },
  { key: 'contacts', label: '외부연락처', disabled: false },
  { key: 'about', label: '앱 소개', disabled: false },
];

interface Props {
  user: User;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('photo');
  const supabase = createClient();
  const store = useWebStore(user.id);

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.user_metadata?.nickname ??
    user.email?.split('@')[0] ??
    '사용자';

  const handleLogout = async () => {
    // 자동로그인 완전 초기화 — 로그아웃 후 재자동로그인 방지
    localStorage.removeItem('an_auto_login');
    localStorage.removeItem('an_saved_pw');
    sessionStorage.setItem('an_skip_auto', 'true');
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <header style={{
        borderBottom: '1px solid #E5E7EB', height: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          width: '100%', maxWidth: 1064, padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* 좌측 균형용 빈 영역 — 우측과 동일 너비 */}
          <div style={{ flex: '0 0 200px' }} />
          <span
            onClick={() => setActiveTab('photo')}
            style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1, flexShrink: 0, cursor: 'pointer' }}
          >
            <span style={{ color: '#2563EB' }}>Admin</span>
            <span style={{ color: '#1C1C1E' }}>Note</span>
          </span>
          <div style={{
            flex: '0 0 200px', display: 'flex', alignItems: 'center',
            gap: 10, justifyContent: 'flex-end', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 14, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{displayName}</span>
            <button onClick={handleLogout} style={{
              fontSize: 13, fontWeight: 500, color: '#6B7280', flexShrink: 0,
              padding: '6px 14px', borderRadius: 20, border: '1px solid #E5E7EB',
              background: '#fff', cursor: 'pointer',
            }}>로그아웃</button>
          </div>
        </div>
      </header>

      {/* 탭 바 */}
      <div style={{
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', justifyContent: 'center', background: '#fff',
        position: 'sticky', top: 100, zIndex: 40,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActiveTab(tab.key)}
              style={{
                padding: '16px 36px', fontSize: 17,
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: tab.disabled ? '#D1D5DB' : '#1C1C1E',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid #1C1C1E' : '3px solid transparent',
                cursor: tab.disabled ? 'default' : 'pointer',
                whiteSpace: 'nowrap', marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      {activeTab === 'about' ? (
        <main style={{ flex: 1 }}>
          <AppIntroView />
        </main>
      ) : (
        <main style={{ flex: 1, padding: '32px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 1000 }}>
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
              {activeTab === 'photo' && <PhotoTransferView userId={user.id} />}
              {activeTab === 'contacts' && (
                <ExternalContactView
                  contacts={store.externalContacts}
                  groups={store.contactGroups}
                />
              )}
            </>
          )}
          </div>
        </main>
      )}

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
