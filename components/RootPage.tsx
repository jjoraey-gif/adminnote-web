'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import MainLayout from './MainLayout';

export default function RootPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // 명시적 로그아웃 후 토큰 갱신 등 부수 이벤트로 재로그인되는 것을 막는 플래그
  const loggedOutRef = useRef(false);

  const supabase = createClient();

  // 홈페이지 방문 집계 (익명 방문자 카운터) — 로그인 여부와 무관하게 페이지 로드 시 1회 기록
  useEffect(() => {
    fetch('/api/track-visit', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // 명시적 로그아웃
        loggedOutRef.current = true;
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        // 사용자가 직접 로그인한 경우 → 플래그 해제 후 인증
        loggedOutRef.current = false;
        setUser(session?.user ?? null);
      } else if (!loggedOutRef.current) {
        // TOKEN_REFRESHED 등 — 로그아웃 전이면 반영, 이후면 무시
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ fontSize: 14, color: '#9CA3AF' }}>불러오는 중...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <MainLayout user={user} onLogout={() => { loggedOutRef.current = true; setUser(null); }} />;
}

// ─── 인증 페이지 ──────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup';
type AccountType = 'personal' | 'shared';

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountType, setAccountType] = useState<AccountType>('personal');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
    }}>
      {/* 로고 */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>
          <span style={{ color: '#2563EB' }}>Admin</span>
          <span style={{ color: '#1C1C1E' }}>Note</span>
        </div>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>공무원 업무수첩</p>
      </div>

      {/* 로그인 / 회원가입 스위치 */}
      <div style={{ display: 'flex', marginBottom: 24, background: '#F3F4F6', borderRadius: 12, padding: 4, width: '100%', maxWidth: 380 }}>
        {(['login', 'signup'] as AuthMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              borderRadius: 9,
              cursor: 'pointer',
              background: mode === m ? '#fff' : 'transparent',
              color: mode === m ? '#1C1C1E' : '#9CA3AF',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      {/* 개인 / 공용폰 탭 */}
      <div style={{ display: 'flex', width: '100%', maxWidth: 380, borderBottom: '1px solid #E5E7EB', marginBottom: 24 }}>
        {(['personal', 'shared'] as AccountType[]).map(t => (
          <button
            key={t}
            onClick={() => setAccountType(t)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 14,
              fontWeight: accountType === t ? 600 : 400,
              border: 'none',
              borderBottom: accountType === t ? '2px solid #2563EB' : '2px solid transparent',
              background: 'none',
              color: accountType === t ? '#2563EB' : '#9CA3AF',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {t === 'personal' ? '개인' : '공용폰'}
          </button>
        ))}
      </div>

      {/* 폼 */}
      <div style={{ width: '100%', maxWidth: 380 }}>
        {mode === 'login'
          ? <LoginForm accountType={accountType} />
          : <SignupForm accountType={accountType} onSuccess={() => setMode('login')} />
        }
      </div>

      {/* 앱 다운로드 링크 */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20, width: '100%', maxWidth: 380 }}>
        <a
          href="https://apps.apple.com/kr/app/%EA%B3%B5%EB%AC%B4%EC%9B%90-%EC%97%85%EB%AC%B4%EC%88%98%EC%B2%A9/id6760883601"
          target="_blank"
          rel="noreferrer"
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#1C1C1E', color: '#fff', padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          <svg width="14" height="17" viewBox="0 0 20 24" fill="none"><path d="M16.5 12.4C16.48 9.86 18.6 8.61 18.7 8.55C17.48 6.74 15.55 6.51 14.88 6.49C13.28 6.31 11.73 7.41 10.9 7.41C10.06 7.41 8.78 6.51 7.43 6.54C5.66 6.57 4.01 7.59 3.1 9.19C1.22 12.41 2.63 17.1 4.44 19.69C5.35 20.96 6.41 22.38 7.8 22.33C9.15 22.28 9.65 21.49 11.28 21.49C12.9 21.49 13.37 22.33 14.77 22.3C16.21 22.28 17.13 21.01 18.01 19.73C19.07 18.27 19.5 16.84 19.52 16.77C19.49 16.76 16.52 15.66 16.5 12.4Z" fill="white"/><path d="M13.66 4.44C14.39 3.55 14.89 2.33 14.75 1.09C13.73 1.13 12.48 1.78 11.73 2.65C11.06 3.43 10.47 4.71 10.62 5.9C11.76 5.99 12.91 5.3 13.66 4.44Z" fill="white"/></svg>
          App Store
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=com.jjoraey.adminnote"
          target="_blank"
          rel="noreferrer"
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#01875F', color: '#fff', padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3.18 23.76c.3.17.64.2.97.1l11.65-11.65L12.34 8.75 3.18 23.76z" fill="white" opacity=".6"/><path d="M1.5 2.67A1.5 1.5 0 0 0 1 3.87v16.26a1.5 1.5 0 0 0 .5 1.2l.07.06 9.11-9.11v-.21L1.57 2.6l-.07.07z" fill="white"/><path d="M15.8 15.73l-3.04-3.04v-.22l3.04-3.04.07.04 3.6 2.05c1.03.58 1.03 1.54 0 2.12l-3.6 2.05-.07.04z" fill="white" opacity=".8"/><path d="M15.87 15.69L12.76 12.6 3.18 23.76c.34.36.89.4 1.3.1l11.39-8.17" fill="white" opacity=".4"/><path d="M15.87 9.51L4.48 1.34A1.02 1.02 0 0 0 3.18.25L12.76 12.6 15.87 9.51z" fill="white" opacity=".4"/></svg>
          Google Play
        </a>
      </div>

      {/* 소셜 로그인 (비활성화 - 코드 보존) */}
      {/* TODO: 재활성화 시 아래 주석 해제
      <SocialLogin />
      */}

      {/* 푸터 */}
      <div style={{ marginTop: 36, display: 'flex', gap: 20 }}>
        <a href="/terms" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>이용약관</a>
        <a href="/privacy" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>개인정보처리방침</a>
      </div>
    </div>
  );
}

// ─── 로그인 폼 ────────────────────────────────────────────────────────────────
// ※ 보안: 비밀번호는 저장하지 않는다.
//   로그인 상태 유지는 Supabase의 세션(refresh token) 지속 기능이 담당하며,
//   RootPage의 getSession()이 새로고침 시 자동으로 세션을 복원한다.
//   여기 저장되는 값은 입력 편의를 위한 비민감 정보(이메일/기관명/아이디)뿐이다.
const AN_KEYS = {
  auto: 'an_auto_login',
  email: 'an_saved_email',
  org: 'an_saved_org',
  uid: 'an_saved_uid',
};
// 이전 버전에서 평문 비밀번호를 저장했던 키 — 마이그레이션 시 반드시 삭제
const LEGACY_PW_KEY = 'an_saved_pw';

function LoginForm({ accountType }: { accountType: AccountType }) {
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);

  const supabase = createClient();

  // 저장된 아이디 정보 복원 (비밀번호는 복원하지 않음)
  useEffect(() => {
    // 과거에 저장된 평문 비밀번호 즉시 제거
    localStorage.removeItem(LEGACY_PW_KEY);

    setAutoLogin(localStorage.getItem(AN_KEYS.auto) === 'true');
    setEmail(localStorage.getItem(AN_KEYS.email) ?? '');
    setOrgName(localStorage.getItem(AN_KEYS.org) ?? '');
    setUserId(localStorage.getItem(AN_KEYS.uid) ?? '');

    const skipAuto = sessionStorage.getItem('an_skip_auto') === 'true';
    if (skipAuto) sessionStorage.removeItem('an_skip_auto');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doLogin = async (
    loginEmail: string, loginOrg: string, loginUid: string, loginPw: string, saveFlag: boolean,
  ) => {
    setLoading(true);
    setError('');
    // 이메일 앞뒤 공백/대소문자 차이로 인한 로그인 실패 방지 (모바일 앱과 동일하게 정규화)
    let finalEmail = loginEmail.trim().toLowerCase();

    if (accountType === 'shared') {
      const res = await fetch('/api/auth/shared-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: loginOrg, userId: loginUid, password: loginPw }),
      });
      const data = await res.json();
      if (!res.ok || !data.email) {
        setError(data.error ?? '아이디 또는 비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }
      finalEmail = data.email;
    }

    const { error: loginErr } = await supabase.auth.signInWithPassword({ email: finalEmail, password: loginPw });
    if (loginErr) {
      // 진단용: 실제 원인은 브라우저 개발자도구 콘솔에서 확인 가능
      console.error('[login] Supabase 로그인 에러:', loginErr.status, loginErr.message);
      if (loginErr.message.includes('Email not confirmed')) {
        setError('이메일 인증이 필요합니다. 받은 편지함을 확인해주세요. (스팸 폴더도 확인해주세요)');
      } else if (loginErr.status === 429) {
        setError('로그인 시도가 너무 많아 일시적으로 제한되었습니다. 잠시 후(약 1분 뒤) 다시 시도해주세요.');
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      setLoading(false);
    } else {
      // 비밀번호는 절대 저장하지 않는다. 로그인 유지는 Supabase 세션이 담당.
      if (saveFlag) {
        localStorage.setItem(AN_KEYS.auto, 'true');
        localStorage.setItem(AN_KEYS.email, loginEmail);
        localStorage.setItem(AN_KEYS.org, loginOrg);
        localStorage.setItem(AN_KEYS.uid, loginUid);
      } else {
        localStorage.removeItem(AN_KEYS.auto);
      }
      localStorage.removeItem(LEGACY_PW_KEY);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, orgName, userId, password, autoLogin);
  };

  // 비밀번호 찾기 화면 (개인 회원만 지원 — 공용폰은 로그인에 이메일을 쓰지 않는다)
  if (showReset) {
    return <ForgotPasswordForm initialEmail={email} onBack={() => setShowReset(false)} />;
  }

  return (
    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {accountType === 'personal' ? (
        <Input label="이메일" type="email" value={email} onChange={setEmail} placeholder="이메일을 입력하세요" autoComplete="email" />
      ) : (
        <>
          <Input label="기관이름" type="text" value={orgName} onChange={setOrgName} placeholder="기관이름을 입력하세요" autoComplete="organization" />
          <Input label="아이디" type="text" value={userId} onChange={setUserId} placeholder="아이디를 입력하세요" autoComplete="username" />
        </>
      )}
      <Input label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="비밀번호를 입력하세요" autoComplete="current-password" />

      {/* 자동로그인 + 비밀번호 찾기 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -2 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={e => setAutoLogin(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#2563EB', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#6B7280' }}>자동로그인</span>
        </label>
        {accountType === 'personal' && (
          <button
            type="button"
            onClick={() => setShowReset(true)}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: '#6B7280', textDecoration: 'underline', cursor: 'pointer' }}
          >
            비밀번호를 잊으셨나요?
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}

// ─── 비밀번호 찾기 폼 ─────────────────────────────────────────────────────────
// 요청만 접수하고, 관리자가 관리자 페이지에서 확인해 임시 비밀번호를 직접 메일로 전달한다.
// ※ 비밀번호는 해시로 저장되므로 기존 비밀번호를 알려주는 것은 불가능하다.
//   Supabase 내장 메일은 프로젝트 전체 시간당 2통 제한이 있어 자동 발송을 쓰지 않는다.
function ForgotPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? '요청 접수에 실패했습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', margin: '0 0 8px' }}>
          초기화 요청이 접수되었습니다
        </p>
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
          padding: '12px 14px', margin: '0 0 16px',
        }}>
          <p style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
            24시간 내에 해당 메일로<br />초기화된 비밀번호가 전송됩니다
          </p>
        </div>
        <p style={{ fontSize: 12.5, color: '#9CA3AF', lineHeight: 1.6, margin: '0 0 20px' }}>
          <b style={{ color: '#6B7280' }}>{email.trim().toLowerCase()}</b><br />
          메일이 보이지 않으면 스팸함도 확인해주세요.
        </p>
        <button type="button" onClick={onBack} style={submitBtn(false)}>로그인으로 돌아가기</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
        가입할 때 등록한 이메일 주소를 입력하고 초기화를 요청하시면, 확인 후 해당 메일로 초기화된 비밀번호를 보내드립니다.
      </p>
      <Input label="이메일" type="email" value={email} onChange={setEmail} placeholder="가입한 이메일을 입력하세요" autoComplete="email" />

      {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        {loading ? '요청 중...' : '비밀번호 초기화 요청하기'}
      </button>
      <button
        type="button"
        onClick={onBack}
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: '#6B7280', textDecoration: 'underline', cursor: 'pointer' }}
      >
        로그인으로 돌아가기
      </button>
    </form>
  );
}

// ─── 회원가입 폼 ──────────────────────────────────────────────────────────────
type CheckState = 'idle' | 'checking' | 'ok' | 'taken';

async function checkDuplicate(type: 'email' | 'nickname', value: string): Promise<CheckState> {
  if (!value.trim()) return 'idle';
  const res = await fetch('/api/auth/check-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, value }),
  });
  const data = await res.json();
  return data.available ? 'ok' : 'taken';
}

function CheckBadge({ state }: { state: CheckState }) {
  if (state === 'idle') return null;
  if (state === 'checking') return <span style={{ fontSize: 12, color: '#9CA3AF' }}>확인 중...</span>;
  if (state === 'ok') return <span style={{ fontSize: 12, color: '#16A34A' }}>✓ 사용 가능</span>;
  return <span style={{ fontSize: 12, color: '#EF4444' }}>✗ 이미 사용 중</span>;
}

function SignupForm({ accountType, onSuccess }: { accountType: AccountType; onSuccess: () => void }) {
  const [nickname, setNickname] = useState('');
  const [nicknameCheck, setNicknameCheck] = useState<CheckState>('idle');
  const [email, setEmail] = useState('');
  const [emailCheck, setEmailCheck] = useState<CheckState>('idle');
  const [orgName, setOrgName] = useState('');
  const [userId, setUserId] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyEmailCheck, setVerifyEmailCheck] = useState<CheckState>('idle');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const supabase = createClient();

  const handleNicknameBlur = async () => {
    if (!nickname.trim()) return;
    setNicknameCheck('checking');
    setNicknameCheck(await checkDuplicate('nickname', nickname));
  };

  const handleEmailBlur = async () => {
    if (!email.trim()) return;
    setEmailCheck('checking');
    setEmailCheck(await checkDuplicate('email', email));
  };

  const handleVerifyEmailBlur = async () => {
    if (!verifyEmail.trim()) return;
    setVerifyEmailCheck('checking');
    setVerifyEmailCheck(await checkDuplicate('email', verifyEmail));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (accountType === 'personal') {
      if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
      if (!email.trim()) { setError('이메일을 입력해주세요.'); return; }
    } else {
      if (!orgName.trim()) { setError('기관이름을 입력해주세요.'); return; }
      if (!userId.trim()) { setError('아이디를 입력해주세요.'); return; }
      if (!verifyEmail.trim()) { setError('이메일을 입력해주세요.'); return; }
    }
    if (!password) { setError('비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!agreeTerms || !agreePrivacy) {
      setError('이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }
    if (emailCheck === 'taken' || verifyEmailCheck === 'taken') {
      setError('이미 사용 중인 이메일입니다.');
      return;
    }
    if (nicknameCheck === 'taken') {
      setError('이미 사용 중인 닉네임입니다.');
      return;
    }

    setLoading(true);

    const signupEmail = accountType === 'personal' ? email : verifyEmail;

    // 서버 API로 회원가입 (email_confirm: true → 이메일 인증 없이 즉시 가입)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail,
        password,
        accountType,
        nickname: nickname.trim() || null,
        orgName: accountType === 'shared' ? orgName : null,
        userId: accountType === 'shared' ? userId : null,
      }),
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error ?? '가입 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }

    // 가입 즉시 로그인 (이메일 인증 없이 확인됨)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: signupEmail, password });
    if (!loginError) {
      // 자동 로그인 성공 → onAuthStateChange가 처리
      return;
    }

    setError('가입은 완료됐지만 로그인에 실패했습니다. 다시 로그인해주세요.');
    setLoading(false);
  };

  if (done) {
    const sentEmail = accountType === 'personal' ? email : verifyEmail;
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>📧</div>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', margin: '0 0 8px' }}>인증 메일을 발송했습니다</p>
        <p style={{ fontSize: 14, color: '#2563EB', fontWeight: 600, margin: '0 0 8px' }}>{sentEmail}</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px' }}>
          위 이메일의 받은 편지함을 확인해주세요.
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 20px' }}>
          스팸 폴더도 확인해주세요.
        </p>
        {accountType === 'shared' && (
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', background: '#F3F4F6', padding: '10px 14px', borderRadius: 8 }}>
            인증 완료 후 <strong>기관이름</strong>과 <strong>아이디</strong>로 로그인해주세요.
          </p>
        )}
        <button
          onClick={async () => {
            const resendEmail = accountType === 'personal' ? email : verifyEmail;
            await createClient().auth.resend({ type: 'signup', email: resendEmail });
            alert('인증 메일을 재발송했습니다.');
          }}
          style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#6B7280', cursor: 'pointer', marginBottom: 12 }}
        >
          인증 메일 재발송
        </button>
        <br />
        <button onClick={onSuccess} style={{ ...submitBtn(false), width: 'auto', padding: '10px 28px' }}>
          로그인하러 가기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {accountType === 'personal' ? (
        <>
          <InputWithCheck
            label="닉네임"
            type="text"
            value={nickname}
            onChange={v => { setNickname(v); setNicknameCheck('idle'); }}
            onBlur={handleNicknameBlur}
            placeholder="닉네임을 입력하세요"
            checkState={nickname ? nicknameCheck : 'idle'}
          />
          <InputWithCheck
            label="이메일"
            type="email"
            value={email}
            onChange={v => { setEmail(v); setEmailCheck('idle'); }}
            onBlur={handleEmailBlur}
            placeholder="이메일을 입력하세요"
            checkState={emailCheck}
          />
        </>
      ) : (
        <>
          <Input label="기관이름" type="text" value={orgName} onChange={setOrgName} placeholder="기관이름을 입력하세요" />
          <Input label="아이디" type="text" value={userId} onChange={setUserId} placeholder="로그인에 사용할 아이디" />
          <InputWithCheck
            label="이메일 (인증용)"
            type="email"
            value={verifyEmail}
            onChange={v => { setVerifyEmail(v); setVerifyEmailCheck('idle'); }}
            onBlur={handleVerifyEmailBlur}
            placeholder="인증 메일 받을 이메일"
            checkState={verifyEmailCheck}
          />
        </>
      )}
      <Input label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="6자 이상" />
      <Input label="비밀번호 확인" type="password" value={passwordConfirm} onChange={setPasswordConfirm} placeholder="비밀번호를 다시 입력하세요" />

      {/* 약관 동의 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
          <span style={{ fontSize: 13, color: '#374151' }}>
            <a href="/terms" target="_blank" style={{ color: '#2563EB', textDecoration: 'none' }}>이용약관</a>에 동의합니다 (필수)
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
          <span style={{ fontSize: 13, color: '#374151' }}>
            <a href="/privacy" target="_blank" style={{ color: '#2563EB', textDecoration: 'none' }}>개인정보처리방침</a>에 동의합니다 (필수)
          </span>
        </label>
      </div>

      {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        {loading ? '가입 중...' : '회원가입'}
      </button>
    </form>
  );
}

// ─── 소셜 로그인 (비활성화 상태로 보존) ──────────────────────────────────────
// 재활성화 시: AuthPage에서 <SocialLogin /> 주석 해제
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SocialLogin() {
  const supabase = createClient();
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'apple') => {
    setSocialLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: 380, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>SNS 로그인</span>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
          style={{ width: '100%', padding: '12px 0', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google로 계속하기
        </button>
        <button onClick={() => handleSocialLogin('kakao')} disabled={!!socialLoading}
          style={{ width: '100%', padding: '12px 0', background: '#FEE500', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          카카오로 계속하기
        </button>
        <button onClick={() => handleSocialLogin('apple')} disabled={!!socialLoading}
          style={{ width: '100%', padding: '12px 0', background: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
          Apple로 계속하기
        </button>
      </div>
    </div>
  );
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid #E5E7EB',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#1C1C1E',
  boxSizing: 'border-box',
};

function Input({ label, type, value, onChange, placeholder, required = true, autoComplete }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; required?: boolean; autoComplete?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={isPassword && showPw ? 'text' : type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required} autoComplete={autoComplete}
          style={isPassword ? { ...inputStyle, paddingRight: 40 } : inputStyle} />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              display: 'flex', alignItems: 'center', color: '#9CA3AF',
            }}
          >
            {showPw ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function InputWithCheck({ label, type, value, onChange, onBlur, placeholder, required = true, checkState }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; onBlur: () => void;
  placeholder: string; required?: boolean; checkState: CheckState;
}) {
  const borderColor = checkState === 'ok' ? '#16A34A' : checkState === 'taken' ? '#EF4444' : '#E5E7EB';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</label>
        <CheckBadge state={checkState} />
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder} required={required}
        style={{ ...inputStyle, border: `1px solid ${borderColor}` }} />
    </div>
  );
}

function submitBtn(loading: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 0',
    background: loading ? '#93C5FD' : '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: 4,
  };
}
