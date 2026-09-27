'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { stockSupabase } from '@/lib/stock-supabase';
import StockLogin from './StockLogin';
import StockDashboard from './StockDashboard';

export default function StockPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    let sb;
    try {
      sb = stockSupabase();
    } catch (e) {
      setConfigError((e as Error).message);
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="p-8 text-center text-sm text-gray-500">불러오는 중…</div>;
  if (configError) return <div className="p-8 text-center text-sm text-red-600">{configError}</div>;
  return session ? <StockDashboard email={session.user.email ?? ''} /> : <StockLogin />;
}
