'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';

const ADMIN_EMAIL = 'jjoraey@naver.com';
const TERMS_URL = 'https://www.adminnote.co.kr/terms';
const PRIVACY_URL = 'https://www.adminnote.co.kr/privacy';
const WITHDRAW_API = 'https://adminnote.co.kr/api/auth/withdraw';

const GRADE_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  vip:  { label: 'VIP',  bg: '#FEF3C7', color: '#D97706' },
  vvip: { label: 'VVIP', bg: '#EDE9FE', color: '#7C3AED' },
};

interface Props {
  user: any;
  onClose: () => void;
  onLogout: () => void;
}

export default function MyPageView({ user, onClose, onLogout }: Props) {
  const supabase = createClient();
  const [grade, setGrade] = useState('normal');
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [nickOpen, setNickOpen] = useState(false);
  const [nickValue, setNickValue] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  // 저장 직후 서버 반영을 기다리지 않고 즉시 화면에 반영하기 위한 로컬 오버라이드
  const [localNickname, setLocalNickname] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const provider = user?.app_metadata?.provider ?? 'email';
  const isEmailUser = provider === 'email';
  const displayName =
    localNickname ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.user_metadata?.nickname ??
    user?.email?.split('@')[0] ?? '사용자';
  const gradeKey = isAdmin ? 'vvip' : grade;
  const gradeStyle = GRADE_STYLE[gradeKey];

  const PROVIDER_STYLE: Record<string, { label: string; color: string }> = {
    email:  { label: '이메일', color: '#2563EB' },
    google: { label: 'Google', color: '#EA4335' },
    apple:  { label: 'Apple',  color: '#1C1C1E' },
  };
  const providerInfo = PROVIDER_STYLE[provider] ?? { label: provider, color: '#6B7280' };

  useEffect(() => {
    if (!user?.id) return;
    if (isAdmin) { setGrade('vvip'); return; }
    supabase.from('profiles').select('grade').eq('id', user.id).single()
      .then(({ data }) => { if (data?.grade) setGrade(data.grade); });
  }, [user?.id]);

  // 닉네임 입력값 초기화 (현재 표시 이름 기준)
  useEffect(() => {
    setNickValue(displayName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleChangeNickname = async () => {
    const trimmed = nickValue.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      alert('닉네임은 2~20자여야 합니다.');
      return;
    }
    setSavingNick(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ data: { nickname: trimmed } });
      if (authErr) throw new Error(authErr.message);

      // profiles 테이블도 함께 갱신 (관리자 페이지 등에서 사용)
      if (user?.id) {
        const { error: profileErr } = await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id);
        if (profileErr) console.error('[MyPage] profiles.nickname 갱신 실패:', profileErr);
      }

      setLocalNickname(trimmed);
      setNickOpen(false);
      alert('닉네임이 변경되었습니다.');
    } catch (e: any) {
      alert(e?.message ?? '닉네임 변경에 실패했습니다.');
    } finally {
      setSavingNick(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw.trim()) { alert('현재 비밀번호를 입력해주세요.'); return; }
    if (newPw.length < 6) { alert('새 비밀번호는 6자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { alert('새 비밀번호가 일치하지 않습니다.'); return; }
    setChangingPw(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (signInErr) throw new Error('현재 비밀번호가 올바르지 않습니다.');
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw new Error(updateErr.message);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwOpen(false);
      alert('비밀번호가 변경되었습니다.');
    } catch (e: any) {
      alert(e?.message ?? '비밀번호 변경에 실패했습니다.');
    } finally {
      setChangingPw(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다.\n정말 탈퇴하시겠습니까?')) return;
    if (!confirm('모든 일정, 예산, 사진 등 데이터가 영구 삭제됩니다.\n계속하시겠습니까?')) return;
    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('세션이 없습니다.');
      const res = await fetch(WITHDRAW_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '탈퇴 처리 오류'); }
      await supabase.auth.signOut();
      onLogout();
    } catch (e: any) {
      alert(e?.message ?? '탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        ref={overlayRef}
        onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex', justifyContent: 'flex-end',
        }}
      >
        {/* 사이드 패널 */}
        <div style={{
          width: 380, height: '100%', background: '#F9FAFB',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
        }}>

          {/* 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 20px 16px', background: '#fff',
            borderBottom: '1px solid #E5E7EB',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>마이페이지</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6B7280', padding: '4px' }}>✕</button>
          </div>

          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 프로필 카드 */}
            <div style={{
              background: '#fff', borderRadius: 14, padding: '18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 26,
                background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 22, color: '#fff' }}>👤</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>{displayName}</span>
                  {gradeStyle && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: gradeStyle.bg, color: gradeStyle.color }}>
                      {gradeStyle.label}
                    </span>
                  )}
                </div>
                {user?.email && (
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                border: `1.5px solid ${providerInfo.color}`, color: providerInfo.color, flexShrink: 0,
              }}>
                {providerInfo.label}
              </span>
            </div>

            {/* 약관 및 정책 */}
            <Section label="약관 및 정책">
              <Row label="서비스 이용약관" onClick={() => window.open(TERMS_URL, '_blank')} arrow />
              <Divider />
              <Row label="개인정보 처리방침" onClick={() => window.open(PRIVACY_URL, '_blank')} arrow />
            </Section>

            {/* 계정 관리 */}
            <Section label="계정 관리">
              <Row
                label="닉네임 변경하기"
                icon="✏️"
                onClick={() => setNickOpen(v => !v)}
                arrow
              />
              {nickOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>닉네임 (2~20자)</div>
                    <input
                      type="text"
                      value={nickValue}
                      onChange={e => setNickValue(e.target.value)}
                      maxLength={20}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
                        borderRadius: 8, fontSize: 14, color: '#1C1C1E', background: '#FAFAFA',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleChangeNickname}
                    disabled={savingNick}
                    style={{
                      width: '100%', padding: '11px 0', background: '#2563EB', color: '#fff',
                      border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                      cursor: savingNick ? 'default' : 'pointer', opacity: savingNick ? 0.6 : 1,
                    }}
                  >
                    {savingNick ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              )}
              <Divider />
              {isEmailUser && (
                <>
                  <Row
                    label="비밀번호 변경하기"
                    icon="🔒"
                    onClick={() => setPwOpen(v => !v)}
                    arrow
                  />
                  {pwOpen && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <PwInput label="현재 비밀번호" value={currentPw} onChange={setCurrentPw} />
                      <PwInput label="새 비밀번호 (6자 이상)" value={newPw} onChange={setNewPw} />
                      <PwInput label="새 비밀번호 확인" value={confirmPw} onChange={setConfirmPw} />
                      <button
                        onClick={handleChangePassword}
                        disabled={changingPw}
                        style={{
                          width: '100%', padding: '11px 0', background: '#2563EB', color: '#fff',
                          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                          cursor: changingPw ? 'default' : 'pointer', opacity: changingPw ? 0.6 : 1,
                        }}
                      >
                        {changingPw ? '변경 중...' : '변경하기'}
                      </button>
                    </div>
                  )}
                  <Divider />
                </>
              )}
              <Row label="로그아웃" onClick={async () => {
                if (!confirm('로그아웃 하시겠습니까?')) return;
                onClose();
                onLogout();
              }} />
              <Divider />
              <Row label="회원 탈퇴" onClick={handleWithdraw} danger disabled={withdrawing} />
            </Section>

          </div>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8, marginLeft: 4 }}>{label}</div>
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, icon, onClick, arrow, danger, disabled }: {
  label: string; icon?: string; onClick: () => void;
  arrow?: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 16px', background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{ fontSize: 15, color: danger ? '#EF4444' : '#1C1C1E' }}>{label}</span>
      </div>
      {arrow && <span style={{ color: '#D1D5DB', fontSize: 16 }}>›</span>}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#F3F4F6', margin: '0 16px' }} />;
}

function PwInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
          borderRadius: 8, fontSize: 14, color: '#1C1C1E', background: '#FAFAFA',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
