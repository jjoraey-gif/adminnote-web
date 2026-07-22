'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '로그인 실패');
        return;
      }
      router.refresh();
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 44px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: 400,
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: 'center', margin: '0 0 8px' }}>
          <span style={{ color: '#2563EB' }}>Admin</span>
          <span style={{ color: '#1C1C1E' }}>Note</span>
        </h1>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', margin: '0 0 32px' }}>관리자 페이지</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            placeholder="아이디"
            value={id}
            onChange={e => setId(e.target.value)}
            required
            style={{
              padding: '14px 16px', fontSize: 15, borderRadius: 12,
              border: '1px solid #E5E7EB', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={e => setPw(e.target.value)}
            required
            style={{
              padding: '14px 16px', fontSize: 15, borderRadius: 12,
              border: '1px solid #E5E7EB', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ fontSize: 13, color: '#EF4444', margin: 0, textAlign: 'center' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px', fontSize: 15, fontWeight: 700,
              background: '#2563EB', color: '#fff', border: 'none',
              borderRadius: 12, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
