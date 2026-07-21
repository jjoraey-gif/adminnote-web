'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import MainLayout from './MainLayout';

export default function RootPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
  return <MainLayout user={user} onLogout={() => setUser(null)} />;
}

// ─── 인증 페이지 (로그인 + 회원가입) ──────────────────────────────────────────
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
      <div style={{ display: 'flex', marginBottom: 24, background: '#F3F4F6', borderRadius: 12, padding: 4, width: '100%', maxWidth: 360 }}>
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
      <div style={{ display: 'flex', marginBottom: 20, gap: 0, width: '100%', maxWidth: 360, borderBottom: '1px solid #E5E7EB' }}>
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
      <div style={{ width: '100%', maxWidth: 360 }}>
        {mode === 'login'
          ? <LoginForm accountType={accountType} />
          : <SignupForm accountType={accountType} />
        }
      </div>

      {/* 소셜 로그인 (비활성화 - 코드 보존) */}
      {/* TODO: 소셜 로그인 재활성화 시 아래 주석 해제
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
function LoginForm({ accountType }: { accountType: AccountType }) {
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const loginEmail = accountType === 'personal'
      ? email
      : `${orgName.trim()}_${userId.trim()}@adminnote-shared.kr`;

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {accountType === 'personal' ? (
        <Input label="이메일" type="email" value={email} onChange={setEmail} placeholder="이메일을 입력하세요" />
      ) : (
        <>
          <Input label="기관이름" type="text" value={orgName} onChange={setOrgName} placeholder="기관이름을 입력하세요" />
          <Input label="아이디" type="text" value={userId} onChange={setUserId} placeholder="아이디를 입력하세요" />
        </>
      )}
      <Input label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="비밀번호를 입력하세요" />

      {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}

// ─── 회원가입 폼 ──────────────────────────────────────────────────────────────
function SignupForm({ accountType }: { accountType: AccountType }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    const signupEmail = accountType === 'personal'
      ? email
      : `${orgName.trim()}_${userId.trim()}@adminnote-shared.kr`;

    const displayName = accountType === 'personal' ? name : `${orgName} (공용)`;

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        data: {
          full_name: displayName,
          account_type: accountType,
          ...(accountType === 'shared' && { org_name: orgName, user_id: userId }),
        },
      },
    });

    if (error) {
      setError(error.message === 'User already registered' ? '이미 가입된 계정입니다.' : '가입 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E', margin: '0 0 8px' }}>가입이 완료됐습니다!</p>
        {accountType === 'personal' && (
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>이메일 인증 후 로그인해 주세요.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {accountType === 'personal' ? (
        <>
          <Input label="이름" type="text" value={name} onChange={setName} placeholder="이름을 입력하세요" />
          <Input label="이메일" type="email" value={email} onChange={setEmail} placeholder="이메일을 입력하세요" />
        </>
      ) : (
        <>
          <Input label="기관이름" type="text" value={orgName} onChange={setOrgName} placeholder="기관이름을 입력하세요" />
          <Input label="아이디" type="text" value={userId} onChange={setUserId} placeholder="아이디를 입력하세요" />
        </>
      )}
      <Input label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="6자 이상" />
      <Input label="비밀번호 확인" type="password" value={passwordConfirm} onChange={setPasswordConfirm} placeholder="비밀번호를 다시 입력하세요" />

      {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        {loading ? '가입 중...' : '회원가입'}
      </button>
    </form>
  );
}

// ─── 소셜 로그인 컴포넌트 (비활성화 상태로 보존) ─────────────────────────────
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
    <div style={{ width: '100%', maxWidth: 360, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>SNS 로그인</span>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => handleSocialLogin('google')} disabled={!!socialLoading} style={{ width: '100%', padding: '12px 0', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google로 계속하기
        </button>
        <button onClick={() => handleSocialLogin('kakao')} disabled={!!socialLoading} style={{ width: '100%', padding: '12px 0', background: '#FEE500', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          카카오로 계속하기
        </button>
        <button onClick={() => handleSocialLogin('apple')} disabled={!!socialLoading} style={{ width: '100%', padding: '12px 0', background: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
          Apple로 계속하기
        </button>
      </div>
    </div>
  );
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────────────────────
function Input({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          width: '100%',
          padding: '11px 14px',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          fontSize: 14,
          outline: 'none',
          background: '#fff',
          color: '#1C1C1E',
          boxSizing: 'border-box',
        }}
      />
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
