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
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 로그인/로그아웃 상태 변화 감지
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

  if (!user) return <LoginForm onLogin={setUser} />;
  return <MainLayout user={user} onLogout={() => setUser(null)} />;
}

// ─── 로그인 폼 ────────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    // 자동로그인 미체크 시 브라우저 닫으면 세션 삭제
    if (!rememberMe) {
      // Supabase는 기본으로 localStorage에 저장하므로 별도 처리 불필요
      // 체크 해제 시에만 sessionStorage 방식 안내 (추후 구현 가능)
    }

    onLogin(data.user);
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

      {/* 폼 카드 */}
      <form
        onSubmit={handleLogin}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#F9FAFB',
          borderRadius: 16,
          padding: '32px 28px',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
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

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
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

        {/* 자동로그인 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#6B7280' }}>자동 로그인</span>
        </label>

        {error && (
          <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 14, margin: '0 0 14px' }}>{error}</p>
        )}

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
            transition: 'background 0.15s',
          }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* 푸터 */}
      <div style={{ marginTop: 32, display: 'flex', gap: 20 }}>
        <a href="/terms" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>이용약관</a>
        <a href="/privacy" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>개인정보처리방침</a>
      </div>
    </div>
  );
}
