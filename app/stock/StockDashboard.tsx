'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { stockSupabase } from '@/lib/stock-supabase';

type Settings = {
  enabled: boolean;
  mode: 'paper' | 'live';
  symbol: string;
  step_pct: number;
  tier_krw: number;
  max_tiers: number;
  fee_rate: number;
  entry_buffer_pct: number;
  fx_fallback: number;
  max_orders_per_day: number;
  updated_at: string;
};
type Tier = {
  id: string; mode: string; grid_price: number; target_qty: number; bought_qty: number; bought_amt: number;
  sold_qty: number; sold_amt: number; status: string; created_at: string; closed_at: string | null; realized_pnl_usd: number;
};
type Order = {
  id: string; tier_id: string; side: 'BUY' | 'SELL'; qty: number; limit_price: number; filled_qty: number;
  status: string; kis_odno: string | null; created_at: string; error: string | null;
};
type Fill = { id: number; side: string; qty: number; amt: number; price: number; created_at: string };
type Log = { id: number; level: string; message: string; created_at: string };

// 설정 폼: [키, 라벨, 단위, 화면↔DB 배율]
const FIELDS: { key: keyof Settings; label: string; unit: string; scale: number; step: string }[] = [
  { key: 'tier_krw', label: '티어당 금액', unit: '원', scale: 1, step: '10000' },
  { key: 'step_pct', label: '매수·매도 간격', unit: '%', scale: 100, step: '0.1' },
  { key: 'max_tiers', label: '최대 티어 수', unit: '개', scale: 1, step: '1' },
  { key: 'fee_rate', label: '수수료율', unit: '%', scale: 100, step: '0.01' },
  { key: 'entry_buffer_pct', label: '진입 매수 여유폭', unit: '%', scale: 100, step: '0.1' },
  { key: 'fx_fallback', label: '예비 환율 (조회 실패 시)', unit: '원/$', scale: 1, step: '1' },
  { key: 'max_orders_per_day', label: '하루 최대 주문 수', unit: '건', scale: 1, step: '1' },
];

const usd = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dt = (s: string) => new Date(s).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const card = 'bg-white rounded-2xl shadow-sm p-5';

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return alert('내보낼 데이터가 없습니다.');
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function StockDashboard({ email }: { email: string }) {
  const sb = stockSupabase();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [closedPnl, setClosedPnl] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [msg, setMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: s, error } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) return setLoadError(error.message);
    if (!s) return setLoadError('owner');
    setLoadError('');
    setSettings(s as Settings);
    const mode = (s as Settings).mode;
    const [t, c, o, f, l] = await Promise.all([
      sb.from('tier_pnl').select('*').eq('mode', mode).eq('status', 'OPEN').order('grid_price', { ascending: false }),
      sb.from('tier_pnl').select('realized_pnl_usd').eq('mode', mode).eq('status', 'CLOSED'),
      sb.from('orders').select('*').eq('mode', mode).in('status', ['SUBMITTING', 'OPEN', 'CANCEL_REQUESTED']).order('limit_price', { ascending: false }),
      sb.from('fills').select('*').order('created_at', { ascending: false }).limit(30),
      sb.from('logs').select('*').order('created_at', { ascending: false }).limit(30),
    ]);
    setTiers((t.data ?? []) as Tier[]);
    const closed = (c.data ?? []) as { realized_pnl_usd: number }[];
    setClosedPnl(closed.reduce((a, r) => a + Number(r.realized_pnl_usd), 0));
    setClosedCount(closed.length);
    setOrders((o.data ?? []) as Order[]);
    setFills((f.data ?? []) as Fill[]);
    setLogs((l.data ?? []) as Log[]);
  }, [sb]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  // 설정이 바뀌면 폼 초기화 (편집 중이 아닐 때만)
  useEffect(() => {
    if (!settings) return;
    setForm((prev) =>
      Object.keys(prev).length ? prev : Object.fromEntries(FIELDS.map((f) => [f.key, String(+(Number(settings[f.key]) * f.scale).toFixed(4))])),
    );
  }, [settings]);

  const openPnl = useMemo(() => tiers.reduce((a, t) => a + Number(t.realized_pnl_usd), 0), [tiers]);
  const heldShares = useMemo(() => tiers.reduce((a, t) => a + t.bought_qty - t.sold_qty, 0), [tiers]);

  const toggle = async () => {
    if (!settings) return;
    const next = !settings.enabled;
    if (next && !confirm(`${settings.mode === 'live' ? '⚠️ 실전 계좌' : '모의투자'}로 자동매매를 시작할까요?`)) return;
    const { error } = await sb.from('settings').update({ enabled: next, updated_at: new Date().toISOString() }).eq('id', 1);
    setMsg(error ? `변경 실패: ${error.message}` : next ? '자동매매를 켰습니다.' : '자동매매를 정지했습니다. 다음 실행에서 미체결 주문을 취소합니다.');
    load();
  };

  const save = async () => {
    const patch: Record<string, number | string> = { updated_at: new Date().toISOString() };
    for (const f of FIELDS) {
      const v = Number(form[f.key]);
      if (!Number.isFinite(v) || v <= 0) return setMsg(`${f.label} 값을 확인해 주세요.`);
      patch[f.key] = f.scale === 1 ? v : v / f.scale;
    }
    if ((patch.step_pct as number) >= 0.5) return setMsg('간격이 너무 큽니다 (50% 미만).');
    setSaving(true);
    const { error } = await sb.from('settings').update(patch).eq('id', 1);
    setSaving(false);
    setMsg(error ? `저장 실패: ${error.message}` : '설정을 저장했습니다. 다음 실행(1분 이내)부터 적용됩니다.');
    setForm({});
    load();
  };

  const exportAll = async (kind: 'tiers' | 'orders' | 'fills') => {
    const table = kind === 'tiers' ? 'tier_pnl' : kind;
    const { data } = await sb.from(table).select('*').order('created_at', { ascending: true });
    downloadCsv(`soxl_${kind}`, (data ?? []) as Record<string, unknown>[]);
  };

  if (loadError === 'owner')
    return (
      <Shell email={email}>
        <div className={card}>
          <p className="font-semibold mb-2">접근 권한이 아직 없습니다</p>
          <p className="text-sm text-gray-600">Supabase SQL 편집기에서 이 계정을 소유자로 지정해 주세요:</p>
          <pre className="mt-3 text-xs bg-gray-100 rounded-lg p-3 overflow-x-auto">
{`update settings set owner_id =
  (select id from auth.users where email = '${email}')
where id = 1;`}
          </pre>
        </div>
      </Shell>
    );
  if (loadError) return <Shell email={email}><p className="text-red-600 text-sm">{loadError}</p></Shell>;
  if (!settings) return <Shell email={email}><p className="text-sm text-gray-500">불러오는 중…</p></Shell>;

  return (
    <Shell email={email}>
      {/* 상태 */}
      <section className={`${card} flex flex-wrap items-center gap-3 justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${settings.mode === 'live' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
            {settings.mode === 'live' ? '실전' : '모의투자'}
          </span>
          <span className="font-semibold">{settings.symbol}</span>
          <span className={`text-sm ${settings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
            ● {settings.enabled ? '자동매매 실행 중' : '정지됨'}
          </span>
        </div>
        <button
          onClick={toggle}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${settings.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {settings.enabled ? '긴급 정지' : '자동매매 시작'}
        </button>
      </section>

      {msg && <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-4 py-2">{msg}</p>}

      {/* 요약 */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['보유 티어', `${tiers.filter((t) => t.bought_qty > t.sold_qty).length} / ${settings.max_tiers}`],
          ['보유 주식', `${heldShares}주`],
          ['누적 실현손익', usd(closedPnl + openPnl)],
          ['종료된 티어', `${closedCount}개`],
        ].map(([k, v]) => (
          <div key={k} className={card}>
            <p className="text-xs text-gray-500">{k}</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      {/* 티어 */}
      <section className={card}>
        <h2 className="font-semibold mb-3">보유 티어</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-gray-500 text-xs">
              <tr className="text-left">
                <th className="py-1">#</th><th>기준가</th><th>매도 목표</th><th>보유/목표</th><th>평균단가</th><th>시작</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="py-1.5">T{i + 1}</td>
                  <td>{usd(t.grid_price)}</td>
                  <td>{usd(Math.ceil(t.grid_price * (1 + Number(settings.step_pct)) * 100 - 1e-6) / 100)}</td>
                  <td>{t.bought_qty - t.sold_qty} / {t.target_qty}</td>
                  <td>{t.bought_qty ? usd(t.bought_amt / t.bought_qty) : '-'}</td>
                  <td>{dt(t.created_at)}</td>
                </tr>
              ))}
              {!tiers.length && <tr><td colSpan={6} className="py-3 text-gray-400">보유 티어 없음</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* 미체결 주문 */}
      <section className={card}>
        <h2 className="font-semibold mb-3">걸려 있는 주문</h2>
        <ul className="text-sm divide-y divide-gray-100 tabular-nums">
          {orders.map((o) => (
            <li key={o.id} className="py-1.5 flex justify-between gap-2">
              <span className={o.side === 'BUY' ? 'text-red-600' : 'text-blue-600'}>{o.side === 'BUY' ? '매수' : '매도'}</span>
              <span>{usd(o.limit_price)} × {o.qty - o.filled_qty}주</span>
              <span className="text-gray-500 text-xs">{o.status === 'CANCEL_REQUESTED' ? '취소 중' : o.status === 'SUBMITTING' ? '접수 중' : '대기'}</span>
            </li>
          ))}
          {!orders.length && <li className="py-2 text-gray-400">없음</li>}
        </ul>
      </section>

      {/* 설정 */}
      <section className={card}>
        <h2 className="font-semibold mb-3">설정</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="text-sm">
              <span className="text-gray-600">{f.label}</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  step={f.step}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 tabular-nums"
                />
                <span className="text-gray-500 w-10">{f.unit}</span>
              </div>
            </label>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
          {saving ? '저장 중…' : '설정 저장'}
        </button>
        <p className="text-xs text-gray-500 mt-2">모의투자/실전 전환은 안전을 위해 Supabase에서만 바꿀 수 있습니다.</p>
      </section>

      {/* 체결·로그 */}
      <section className="grid sm:grid-cols-2 gap-3">
        <div className={card}>
          <h2 className="font-semibold mb-3">최근 체결</h2>
          <ul className="text-sm divide-y divide-gray-100 tabular-nums">
            {fills.map((f) => (
              <li key={f.id} className="py-1.5 flex justify-between">
                <span className={f.side === 'BUY' ? 'text-red-600' : 'text-blue-600'}>{f.side === 'BUY' ? '매수' : '매도'}</span>
                <span>{usd(f.price)} × {f.qty}</span>
                <span className="text-gray-500 text-xs">{dt(f.created_at)}</span>
              </li>
            ))}
            {!fills.length && <li className="py-2 text-gray-400">없음</li>}
          </ul>
        </div>
        <div className={card}>
          <h2 className="font-semibold mb-3">실행 로그</h2>
          <ul className="text-xs divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id} className={`py-1.5 ${l.level === 'error' ? 'text-red-600' : l.level === 'warn' ? 'text-amber-600' : 'text-gray-700'}`}>
                <span className="text-gray-400 mr-2">{dt(l.created_at)}</span>{l.message}
              </li>
            ))}
            {!logs.length && <li className="py-2 text-gray-400">없음</li>}
          </ul>
        </div>
      </section>

      {/* 내보내기 */}
      <section className={`${card} flex flex-wrap gap-2`}>
        <span className="text-sm text-gray-600 mr-2 self-center">엑셀(CSV) 다운로드</span>
        {(['tiers', 'orders', 'fills'] as const).map((k) => (
          <button key={k} onClick={() => exportAll(k)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            {{ tiers: '티어·손익', orders: '주문 내역', fills: '체결 내역' }[k]}
          </button>
        ))}
      </section>
    </Shell>
  );
}

function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">SOXL 자동매매</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="hidden sm:inline">{email}</span>
          <button onClick={() => stockSupabase().auth.signOut()} className="hover:text-gray-900">로그아웃</button>
        </div>
      </header>
      {children}
    </div>
  );
}
