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
import MyPageView from './MyPageView';
import HistoryView from './HistoryView';
import PromotionRankView from './PromotionRankView';
import OrgChartView from './OrgChartView';

const MAIN_TABS = [
  { key: 'photo',    label: '사진전송' },
  { key: 'schedule', label: '업무일정' },
  { key: 'todo',     label: '오늘 할 일' },
  { key: 'budget',   label: '예산관리' },
  { key: 'more',     label: '더보기' },
];

const MORE_TABS = [
  { key: 'history',   label: '이력관리' },
  { key: 'promotion', label: '승진순위관리' },
  { key: 'org',       label: '부서조직도' },
  { key: 'contacts',  label: '외부연락처' },
  { key: 'about',     label: '앱 소개' },
];


interface Props {
  user: User;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('photo');
  const [activeMoreTab, setActiveMoreTab] = useState('history');
  const [myPageOpen, setMyPageOpen] = useState(false);
  const showMoreBar = activeTab === 'more';
  const currentTab = activeTab === 'more' ? activeMoreTab : activeTab;
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
      {myPageOpen && (
        <MyPageView
          user={user}
          onClose={() => setMyPageOpen(false)}
          onLogout={handleLogout}
        />
      )}

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
            <span style={{ fontSize: 14, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{displayName}</span>
            <button
              onClick={() => setMyPageOpen(true)}
              title="마이페이지"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 22, padding: '2px 4px', color: '#6B7280', flexShrink: 0,
              }}
            >⚙️</button>
          </div>
        </div>
      </header>

      {/* 메인 탭 바 */}
      <div style={{
        borderBottom: showMoreBar ? 'none' : '1px solid #E5E7EB',
        display: 'flex', justifyContent: 'center', background: '#fff',
        position: 'sticky', top: 100, zIndex: 40,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '16px 36px', fontSize: 20,
                  fontWeight: isActive ? 700 : 500,
                  color: '#1C1C1E',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '3px solid #1C1C1E' : '3px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap', marginBottom: -1, transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 더보기 서브 탭 바 */}
      {showMoreBar && (
        <div style={{
          borderBottom: '1px solid #E5E7EB', borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'center', background: '#F9FAFB',
          position: 'sticky', top: 153, zIndex: 39,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
            {MORE_TABS.map((tab) => {
              const isActive = activeMoreTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveMoreTab(tab.key)}
                  style={{
                    padding: '12px 28px', fontSize: 15,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#2563EB' : '#6B7280',
                    background: 'none', border: 'none',
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap', marginBottom: -1, transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      {currentTab === 'about' ? (
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
              {currentTab === 'schedule' && (
                <ScheduleView
                  events={store.events}
                  onAdd={store.addEvent}
                  onUpdate={store.updateEvent}
                  onDelete={store.deleteEvent}
                  onToggle={store.toggleEvent}
                />
              )}
              {currentTab === 'todo' && (
                <TodoView
                  todos={store.todos}
                  topics={store.todoTopics}
                  onAdd={store.addTodo}
                  onUpdate={store.updateTodo}
                  onToggle={store.toggleTodo}
                  onDelete={store.deleteTodo}
                  onAddTopic={store.addTodoTopic}
                  onRenameTopic={store.renameTodoTopic}
                  onDeleteTopic={store.deleteTodoTopic}
                  onReorderTopics={store.reorderTodoTopics}
                />
              )}
              {currentTab === 'budget' && (
                <BudgetView
                  subProjects={store.subProjects}
                  onAddSubProject={store.addSubProject}
                  onUpdateSubProject={store.updateSubProject}
                  onDeleteSubProject={store.deleteSubProject}
                  onReorderSubProjects={store.reorderSubProjects}
                  onAddSpent={store.addSpent}
                  onUpdateSpent={store.updateSpent}
                />
              )}
              {currentTab === 'photo' && <PhotoTransferView userId={user.id} userEmail={user.email ?? ''} />}
              {currentTab === 'contacts' && (
                <ExternalContactView
                  contacts={store.externalContacts}
                  groups={store.contactGroups}
                  onAdd={store.addContact}
                  onUpdate={store.updateContact}
                  onDelete={store.deleteContact}
                  onAddGroup={store.addContactGroup}
                  onUpdateGroup={store.updateContactGroup}
                  onDeleteGroup={store.deleteContactGroup}
                />
              )}
              {currentTab === 'history' && (
                <HistoryView
                  promotions={store.promotions}
                  assignments={store.assignments}
                  awards={store.awards}
                  careerInfo={store.careerInfo}
                  onAddPromotion={store.addPromotion}
                  onUpdatePromotion={store.updatePromotion}
                  onDeletePromotion={store.deletePromotion}
                  onAddAssignment={store.addAssignment}
                  onUpdateAssignment={store.updateAssignment}
                  onDeleteAssignment={store.deleteAssignment}
                  onAddAward={store.addAward}
                  onUpdateAward={store.updateAward}
                  onDeleteAward={store.deleteAward}
                  onUpdateCareerInfo={store.updateCareerInfo}
                />
              )}
              {currentTab === 'promotion' && (
                <PromotionRankView
                  performanceRatings={store.performanceRatings}
                  pastPerformanceRatings={store.pastPerformanceRatings}
                  sameGradePromotions={store.sameGradePromotions}
                  onReplacePerformanceRating={store.replacePerformanceRating}
                  onDeletePerformanceRating={store.deletePerformanceRating}
                  onAddPastPerformanceRating={store.addPastPerformanceRating}
                  onUpdatePastPerformanceRating={store.updatePastPerformanceRating}
                  onDeletePastPerformanceRating={store.deletePastPerformanceRating}
                  onAddSameGradePromotion={store.addSameGradePromotion}
                  onUpdateSameGradePromotion={store.updateSameGradePromotion}
                  onDeleteSameGradePromotion={store.deleteSameGradePromotion}
                  onClearSameGradePromotions={store.clearSameGradePromotions}
                  onClearPromotionRankData={store.clearPromotionRankData}
                  onAddPromotion={store.addPromotion}
                />
              )}
              {currentTab === 'org' && (
                <OrgChartView
                  orgDepartments={store.orgDepartments}
                  onSetDepartments={store.setDepartments}
                  onAddDepartment={store.addDepartment}
                  onUpdateDepartment={store.updateDepartment}
                  onDeleteDepartment={store.deleteDepartment}
                  onMoveMemberToTeam={store.moveMemberToTeam}
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
