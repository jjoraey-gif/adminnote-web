'use client';

import { useCallback, useEffect, useState } from 'react';
import { stockSupabase } from '@/lib/stock-supabase';

const LEN = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function StockLogin() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(async (value: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stock/pin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: value }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? '로그인 실패');
      const { error } = await stockSupabase().auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
      if (error) throw error;
    } catch (e) {
      setError((e as Error).message);
      setPin('');
    } finally {
      setLoading(false);
    }
  }, []);

  const press = useCallback(
    (k: string) => {
      if (loading) return;
      if (k === '⌫') return setPin((p) => p.slice(0, -1));
      if (!/^\d$/.test(k) || pin.length >= LEN) return;
      const next = pin + k;
      setPin(next);
      if (next.length === LEN) submit(next);
    },
    [loading, pin, submit],
  );

  // PC 키보드 입력
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') press('⌫');
      else if (/^\d$/.test(e.key)) press(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <p className="text-2xl font-bold">SOXL 자동매매</p>
        <p className="text-gray-500 text-sm mt-2">간편 비밀번호 6자리</p>

        <div className="flex justify-center gap-3 my-8" aria-label={`${pin.length}자리 입력됨`}>
          {Array.from({ length: LEN }).map((_, i) => (
            <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < pin.length ? 'bg-gray-900' : 'bg-gray-300'}`} />
          ))}
        </div>

        <p className="h-5 text-sm text-red-500 mb-4">{loading ? <span className="text-gray-500">확인 중…</span> : error}</p>

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(k)}
                disabled={loading}
                aria-label={k === '⌫' ? '지우기' : k}
                className="h-16 rounded-2xl bg-white shadow-sm text-2xl font-medium active:bg-gray-100 disabled:opacity-50"
              >
                {k}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
