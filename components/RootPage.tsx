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

  if (!user) return <LoginForm />;
  return <MainLayout user={user} onLogout={() => setUser(null)} />;
}

// ─── 로그인 폼 ────────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'apple') => {
    setSocialLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

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
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>
          <span style={{ color: '#2563EB' }}>Admin</span>
          <span style={{ color: '#1C1C1E' }}>Note</span>
        </div>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>공무원 업무수첩</p>
      </div>

      {/* 소셜 로그인 버튼들 */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 구글 */}
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={socialLoading !== null}
          style={{
            width: '100%',
            padding: '13px 0',
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            color: '#1C1C1E',
            cursor: socialLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: socialLoading && socialLoading !== 'google' ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {socialLoading === 'google' ? '연결 중...' : 'Google로 계속하기'}
        </button>

        {/* 카카오 */}
        <button
          onClick={() => handleSocialLogin('kakao')}
          disabled={socialLoading !== null}
          style={{
            width: '100%',
            padding: '13px 0',
            background: '#FEE500',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            color: '#000000CC',
            cursor: socialLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: socialLoading && socialLoading !== 'kakao' ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.72 1.56 5.12 3.96 6.6L5 21l4.24-2.8c.88.2 1.8.3 2.76.3 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" fill="#000000CC"/>
          </svg>
          {socialLoading === 'kakao' ? '연결 중...' : '카카오로 계속하기'}
        </button>

        {/* 애플 */}
        <button
          onClick={() => handleSocialLogin('apple')}
          disabled={socialLoading !== null}
          style={{
            width: '100%',
            padding: '13px 0',
            background: '#000',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            color: '#fff',
            cursor: socialLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: socialLoading && socialLoading !== 'apple' ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          <svg width="18" height="20" viewBox="0 0 814 1000" fill="white">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.7 0 663.5 0 541.8c0-207.2 135.4-316.5 270.7-316.5 67.2 0 123.1 43.4 163.9 43.4 39.3 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
          </svg>
          {socialLoading === 'apple' ? '연결 중...' : 'Apple로 계속하기'}
        </button>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>

        {/* 이메일 로그인 토글 */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            style={{
              width: '100%',
              padding: '13px 0',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              color: '#6B7280',
              cursor: 'pointer',
            }}
          >
            이메일로 로그인
          </button>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일"
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
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#6B7280' }}>자동 로그인</span>
            </label>

            {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 0',
                background: loading ? '#93C5FD' : '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}
      </div>

      {/* 푸터 */}
      <div style={{ marginTop: 40, display: 'flex', gap: 20 }}>
        <a href="/terms" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>이용약관</a>
        <a href="/privacy" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>개인정보처리방침</a>
      </div>
    </div>
  );
}
