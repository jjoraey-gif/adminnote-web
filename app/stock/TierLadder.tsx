'use client';

import { Fragment, useMemo } from 'react';

export type LadderTier = {
  id: string;
  grid_price: number;
  target_qty: number;
  bought_qty: number;
  bought_amt: number;
  sold_qty: number;
  buy_done: boolean;
  created_at: string;
};
export type LadderSettings = {
  step_pct: number;
  tier_krw: number;
  max_tiers: number;
  fee_rate: number;
  entry_buffer_pct: number;
  fx_fallback: number;
};
export type Market = { price: number | null; fx: number | null; price_at: string | null };

type Kind = '보유' | '일부 매수' | '매수 대기' | '진입 예정' | '예정';
type Row = {
  n: number;
  kind: Kind;
  buy: number; // 매수가(기준가)
  sell: number; // 매도 목표
  held: number;
  target: number;
  cost: number; // 투입(보유분) 또는 예상 투입 (USD)
  avg: number | null;
};

// 전략 엔진(strategy.ts)과 같은 반올림 규칙
const floorCent = (x: number) => Math.floor(Math.round(x * 1e6) / 1e4) / 100;
const ceilCent = (x: number) => Math.ceil(Math.round(x * 1e6) / 1e4) / 100;
const usd = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const krw = (n: number) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`;
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

const BADGE: Record<Kind, string> = {
  보유: 'bg-blue-50 text-blue-700',
  '일부 매수': 'bg-amber-50 text-amber-700',
  '매수 대기': 'bg-red-50 text-red-600',
  '진입 예정': 'bg-gray-100 text-gray-600',
  예정: 'bg-gray-100 text-gray-500',
};

export default function TierLadder({ tiers, s, market }: { tiers: LadderTier[]; s: LadderSettings; market: Market }) {
  const step = Number(s.step_pct);
  const fx = Number(market.fx) || Number(s.fx_fallback);
  const price = market.price ? Number(market.price) : null;

  const rows = useMemo<Row[]>(() => {
    const qtyFor = (p: number) => Math.floor(Number(s.tier_krw) / (p * fx * (1 + Number(s.fee_rate))));
    const sorted = [...tiers].sort((a, b) => b.grid_price - a.grid_price);
    const out: Row[] = [];
    for (const t of sorted) {
      const g = Number(t.grid_price);
      const held = t.bought_qty - t.sold_qty;
      const kind: Kind = t.bought_qty === 0 ? '매수 대기' : !t.buy_done && t.bought_qty < t.target_qty ? '일부 매수' : '보유';
      out.push({
        n: out.length + 1,
        kind,
        buy: g,
        sell: ceilCent(g * (1 + step)),
        held,
        target: t.target_qty,
        cost: t.bought_qty ? (Number(t.bought_amt) / t.bought_qty) * held : g * t.target_qty,
        avg: t.bought_qty ? Number(t.bought_amt) / t.bought_qty : null,
      });
    }
    // 앞으로 사게 될 티어 (예상)
    let last: number | null = out.length ? out[out.length - 1].buy : null;
    if (last === null && price) {
      last = floorCent(price * (1 + Number(s.entry_buffer_pct)));
      out.push({ n: 1, kind: '진입 예정', buy: last, sell: ceilCent(last * (1 + step)), held: 0, target: qtyFor(last), cost: last * qtyFor(last), avg: null });
    }
    while (last !== null && out.length < Number(s.max_tiers)) {
      last = floorCent(last * (1 - step));
      const q = qtyFor(last);
      out.push({ n: out.length + 1, kind: '예정', buy: last, sell: ceilCent(last * (1 + step)), held: 0, target: q, cost: last * q, avg: null });
    }
    return out;
  }, [tiers, s, fx, price, step]);

  const heldRows = rows.filter((r) => r.held > 0);
  const invested = heldRows.reduce((a, r) => a + r.cost, 0);
  const value = price ? heldRows.reduce((a, r) => a + r.held * price, 0) : null;
  const pnl = value !== null ? value - invested : null;
  const remainingNeed = rows.filter((r) => r.held === 0).reduce((a, r) => a + r.cost, 0);

  // 현재가 구분선 위치: 매수가가 현재가보다 처음으로 낮아지는 행 앞
  const markerAt = price ? rows.findIndex((r) => r.buy < price) : -1;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold">티어 현황</h2>
        <p className="text-xs text-gray-500">
          현재가 {price ? usd(price) : '—'} · 환율 {fx.toLocaleString('ko-KR')}원{market.fx ? '' : ' (예비)'}
          {market.price_at && ` · ${new Date(market.price_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 기준`}
        </p>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[640px] text-sm tabular-nums">
          <thead className="text-xs text-gray-500">
            <tr className="text-right border-b border-gray-100">
              <th className="py-2 text-left font-medium">티어</th>
              <th className="text-left font-medium">상태</th>
              <th className="font-medium">매수가</th>
              <th className="font-medium">매도 목표</th>
              <th className="font-medium">수량</th>
              <th className="font-medium">투입 금액</th>
              <th className="font-medium">평가손익</th>
              <th className="font-medium pr-1">목표까지</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const future = r.kind === '예정' || r.kind === '진입 예정';
              const rowPnl = price && r.held > 0 && r.avg ? (price - r.avg) * r.held : null;
              const rowPnlPct = price && r.avg ? ((price - r.avg) / r.avg) * 100 : null;
              // 보유 중이면 매도 목표까지, 아니면 매수가까지 남은 거리
              const toTarget = price ? ((r.held > 0 ? r.sell : r.buy) / price - 1) * 100 : null;
              return (
                <Fragment key={i}>
                  {i === markerAt && price && (
                    <tr>
                      <td colSpan={8} className="py-1">
                        <div className="flex items-center gap-2 text-xs text-gray-900 font-semibold">
                          <span className="h-px flex-1 bg-gray-900" />현재가 {usd(price)}<span className="h-px flex-1 bg-gray-900" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className={`text-right border-b border-gray-50 ${future ? 'text-gray-400' : ''}`}>
                    <td className="py-2 text-left font-medium">T{r.n}</td>
                    <td className="text-left">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${BADGE[r.kind]}`}>{r.kind}</span>
                    </td>
                    <td>{usd(r.buy)}</td>
                    <td>{usd(r.sell)}</td>
                    <td>{r.held > 0 ? `${r.held}${r.held !== r.target ? ` / ${r.target}` : ''}주` : `${r.target}주`}</td>
                    <td>
                      {usd(r.cost)}
                      <span className="block text-[11px] text-gray-400">{krw(r.cost * fx)}</span>
                    </td>
                    <td className={rowPnl === null ? '' : rowPnl >= 0 ? 'text-red-600' : 'text-blue-600'}>
                      {rowPnl === null ? '—' : (
                        <>
                          {rowPnl >= 0 ? '+' : ''}{usd(rowPnl)}
                          <span className="block text-[11px]">{pct(rowPnlPct!)}</span>
                        </>
                      )}
                    </td>
                    <td className="pr-1 text-gray-500">{toTarget === null ? '—' : pct(toTarget)}</td>
                  </tr>
                </Fragment>
              );
            })}
            {markerAt === -1 && price && rows.length > 0 && (
              <tr>
                <td colSpan={8} className="py-1">
                  <div className="flex items-center gap-2 text-xs text-gray-900 font-semibold">
                    <span className="h-px flex-1 bg-gray-900" />현재가 {usd(price)}<span className="h-px flex-1 bg-gray-900" />
                  </div>
                </td>
              </tr>
            )}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-4 text-center text-gray-400">현재가 정보가 없습니다. 아래 &quot;연결 점검&quot;을 한 번 실행해 주세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-sm tabular-nums">
        <Stat label="보유분 투입" value={usd(invested)} sub={krw(invested * fx)} />
        <Stat label="보유분 평가" value={value === null ? '—' : usd(value)} sub={value === null ? '' : krw(value * fx)} />
        <Stat
          label="평가손익"
          value={pnl === null ? '—' : `${pnl >= 0 ? '+' : ''}${usd(pnl)}`}
          sub={pnl === null || !invested ? '' : pct((pnl / invested) * 100)}
          tone={pnl === null ? undefined : pnl >= 0 ? 'text-red-600' : 'text-blue-600'}
        />
        <Stat label="남은 티어 매수 예상 금액" value={usd(remainingNeed)} sub={krw(remainingNeed * fx)} />
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        회색 행은 아직 주문하지 않은 예상치입니다. 예상 수량·금액은 현재 환율과 설정 기준이며 실제와 다를 수 있습니다. 목표까지: 보유 티어는 매도 목표가, 나머지는 매수가까지의 거리.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`font-semibold ${tone ?? ''}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
