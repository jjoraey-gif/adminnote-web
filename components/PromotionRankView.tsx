'use client';

import { useState, useMemo } from 'react';
import { PerformanceRating, SameGradePromotion, PromotionRecord } from '@/lib/useWebStore';

const C = { blue: '#2563EB', green: '#16A34A', red: '#EF4444', gray: '#8E8E93', border: '#E5E7EB', text: '#1C1C1E', bg: '#F9FAFB', card: '#fff' };
const RANKS = ['9급', '8급', '7급', '6급', '5급', '4급'];

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  performanceRatings: PerformanceRating[];
  pastPerformanceRatings: PerformanceRating[];
  sameGradePromotions: SameGradePromotion[];
  onReplacePerformanceRating: (r: PerformanceRating) => void;
  onDeletePerformanceRating: (id: string) => void;
  onAddPastPerformanceRating: (r: PerformanceRating) => void;
  onUpdatePastPerformanceRating: (r: PerformanceRating) => void;
  onDeletePastPerformanceRating: (id: string) => void;
  onAddSameGradePromotion: (p: SameGradePromotion) => void;
  onUpdateSameGradePromotion: (p: SameGradePromotion) => void;
  onDeleteSameGradePromotion: (id: string) => void;
  onClearSameGradePromotions: () => void;
  onClearPromotionRankData: () => void;
  onAddPromotion: (p: PromotionRecord) => void;
}

type FormKind = 'rank' | 'promo' | 'past' | 'promotion' | null;

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function PromotionRankView({
  performanceRatings, pastPerformanceRatings, sameGradePromotions,
  onReplacePerformanceRating, onDeletePerformanceRating,
  onAddPastPerformanceRating, onUpdatePastPerformanceRating, onDeletePastPerformanceRating,
  onAddSameGradePromotion, onUpdateSameGradePromotion, onDeleteSameGradePromotion,
  onClearSameGradePromotions, onClearPromotionRankData,
  onAddPromotion,
}: Props) {
  const [form, setForm] = useState<{ kind: FormKind; data?: any } | null>(null);
  const [rankMenuOpen, setRankMenuOpen] = useState(false);

  const latest = useMemo(() =>
    [...performanceRatings].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    [performanceRatings]);
  const pastRatings = useMemo(() =>
    [...pastPerformanceRatings].sort((a, b) => b.date.localeCompare(a.date)),
    [pastPerformanceRatings]);
  const promos = useMemo(() =>
    [...sameGradePromotions].sort((a, b) => a.date.localeCompare(b.date)),
    [sameGradePromotions]);

  const totalPromoted = promos.reduce((a, p) => a + p.count, 0);
  const actualRank = latest ? latest.rank - totalPromoted : null;
  const rankDiff = useMemo(() => {
    if (!latest || pastRatings.length === 0) return null;
    return pastRatings[0].rank - latest.rank; // 양수 = 상승
  }, [latest, pastRatings]);

  const open = (kind: FormKind, data?: any) => setForm({ kind, data });
  const close = () => setForm(null);

  const handleSubmit = (payload: { date: string; rank?: number; count?: number; grade?: string }) => {
    if (!form) return;
    if (form.kind === 'rank') {
      onReplacePerformanceRating({ id: uuid(), date: payload.date, rank: payload.rank! });
    } else if (form.kind === 'promo') {
      if (form.data) onUpdateSameGradePromotion({ ...form.data, date: payload.date, count: payload.count! });
      else onAddSameGradePromotion({ id: uuid(), date: payload.date, count: payload.count! });
    } else if (form.kind === 'past') {
      if (form.data) onUpdatePastPerformanceRating({ ...form.data, date: payload.date, rank: payload.rank! });
      else onAddPastPerformanceRating({ id: uuid(), date: payload.date, rank: payload.rank! });
    } else if (form.kind === 'promotion') {
      close();
      if (!confirm(`🎉 ${payload.grade}으로 승진을 입력하시겠습니까?\n이력관리에 자동 등록됩니다.`)) return;
      onAddPromotion({ id: uuid(), grade: payload.grade!, date: payload.date, note: '승진' });
      if (confirm('순위 데이터(근평순위, 과거이력, 승진자 수)를 삭제할까요?')) {
        onClearPromotionRankData();
      }
      return;
    }
    close();
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* 헤더: 승진 입력 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={() => open('promotion')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.card, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >🎖 승진 입력</button>
      </div>

      {/* ── 최근 근평 순위 ── */}
      <SectionHeader title="최근 근평 순위" onAdd={() => open('rank')} />
      <div style={cardStyle}>
        {latest ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* 왼쪽: 순위 */}
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setRankMenuOpen(v => !v)}>
              <div style={{ fontSize: 13, color: C.gray, marginBottom: 2 }}>{latest.date}</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{latest.rank}위</div>
              {rankDiff !== null && rankDiff !== 0 && (
                <div style={{ fontSize: 12, fontWeight: 600, color: rankDiff > 0 ? C.green : C.red, marginTop: 4 }}>
                  직전 대비 {Math.abs(rankDiff)}위 {rankDiff > 0 ? '▲ 상승' : '▼ 하락'}
                </div>
              )}
            </div>
            {/* 오른쪽: 실제 예상 순위 or 메뉴 */}
            {rankMenuOpen ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F3F4F6', borderRadius: 10, padding: '6px 10px' }}>
                <button onClick={() => { open('rank', latest); setRankMenuOpen(false); }} style={inlineBtn(C.blue)}>수정</button>
                <button onClick={() => { onDeletePerformanceRating(latest.id); setRankMenuOpen(false); }} style={inlineBtn(C.red)}>삭제</button>
                <button onClick={() => setRankMenuOpen(false)} style={inlineBtn(C.gray)}>✕</button>
              </div>
            ) : actualRank != null ? (
              <div style={{ background: '#F2F2F7', borderRadius: 14, padding: '10px 18px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>실제 예상 순위</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: actualRank <= 3 ? C.green : C.blue }}>{actualRank}위</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.red, marginTop: 2 }}>승진 {totalPromoted}명 차감</div>
              </div>
            ) : null}
          </div>
        ) : (
          <Empty text="등록된 최근 근평 순위가 없습니다" />
        )}
      </div>

      {/* ── 동직급 승진자 수 ── */}
      <SectionHeader title="최근 근평 후 동직급 승진자 수" onAdd={() => open('promo')} />
      <div style={{ ...cardStyle, padding: 0 }}>
        {promos.length === 0 ? (
          <Empty text="등록된 승진자 수가 없습니다" />
        ) : promos.map((p, i) => (
          <PromoRow
            key={p.id} promo={p}
            last={i === promos.length - 1}
            onEdit={() => open('promo', p)}
            onDelete={() => { if (confirm(`${p.date} 항목을 삭제하시겠습니까?`)) onDeleteSameGradePromotion(p.id); }}
          />
        ))}
      </div>

      {/* ── 과거 근평 순위 이력 ── */}
      <SectionHeader title="과거 근평 순위 이력" onAdd={() => open('past')} />
      <div style={{ ...cardStyle, padding: 0, marginBottom: 0 }}>
        {pastRatings.length === 0 ? (
          <Empty text="등록된 과거 근평 이력이 없습니다" />
        ) : pastRatings.map((r, i) => (
          <PastRow
            key={r.id} rating={r}
            last={i === pastRatings.length - 1}
            onEdit={() => open('past', r)}
            onDelete={() => { if (confirm(`${r.date} 항목을 삭제하시겠습니까?`)) onDeletePastPerformanceRating(r.id); }}
          />
        ))}
      </div>

      {/* 폼 모달 */}
      {form && (
        <FormModal
          kind={form.kind!} data={form.data}
          onClose={close} onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ── 섹션 헤더 ─────────────────────────────────────────────────────────────────
function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 6 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</span>
      <button onClick={onAdd} style={{ background: 'none', border: 'none', fontSize: 26, fontWeight: 300, cursor: 'pointer', color: C.text, padding: '0 4px' }}>＋</button>
    </div>
  );
}

// ── 동직급 승진자 행 ──────────────────────────────────────────────────────────
function PromoRow({ promo, last, onEdit, onDelete }: { promo: SameGradePromotion; last: boolean; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{promo.date}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.blue }}>{promo.count}명 승진</span>
      </div>
      {menuOpen ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F3F4F6', borderRadius: 10, padding: '5px 10px' }}>
          <button onClick={() => { onEdit(); setMenuOpen(false); }} style={inlineBtn(C.blue)}>수정</button>
          <button onClick={() => { onDelete(); setMenuOpen(false); }} style={inlineBtn(C.red)}>삭제</button>
          <button onClick={() => setMenuOpen(false)} style={inlineBtn(C.gray)}>✕</button>
        </div>
      ) : (
        <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#C7C7CC', cursor: 'pointer', padding: '4px 8px' }}>⋯</button>
      )}
    </div>
  );
}

// ── 과거 근평 순위 행 ─────────────────────────────────────────────────────────
function PastRow({ rating, last, onEdit, onDelete }: { rating: PerformanceRating; last: boolean; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{rating.date}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.blue }}>{rating.rank}위</span>
      </div>
      {menuOpen ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F3F4F6', borderRadius: 10, padding: '5px 10px' }}>
          <button onClick={() => { onEdit(); setMenuOpen(false); }} style={inlineBtn(C.blue)}>수정</button>
          <button onClick={() => { onDelete(); setMenuOpen(false); }} style={inlineBtn(C.red)}>삭제</button>
          <button onClick={() => setMenuOpen(false)} style={inlineBtn(C.gray)}>✕</button>
        </div>
      ) : (
        <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#C7C7CC', cursor: 'pointer', padding: '4px 8px' }}>⋯</button>
      )}
    </div>
  );
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────
function Empty({ text }: { text: string }) {
  return <div style={{ padding: '18px 0', textAlign: 'center', color: '#C7C7CC', fontSize: 13 }}>{text}</div>;
}

// ── 폼 모달 ──────────────────────────────────────────────────────────────────
function FormModal({ kind, data, onClose, onSubmit }: {
  kind: FormKind; data?: any; onClose: () => void;
  onSubmit: (p: { date: string; rank?: number; count?: number; grade?: string }) => void;
}) {
  const [date, setDate] = useState<string>(data?.date ?? todayStr());
  const [rank, setRank] = useState(data?.rank ? String(data.rank) : '');
  const [count, setCount] = useState(data?.count ? String(data.count) : '');
  const [grade, setGrade] = useState('');

  const titleMap: Record<string, string> = {
    rank: '근평 순위 입력',
    promo: '동직급 승진자 수',
    past: '과거 근평 순위',
    promotion: '승진 입력',
  };

  const canSave =
    kind === 'promo' ? !!count && Number(count) > 0 :
    kind === 'promotion' ? !!grade :
    !!rank && Number(rank) > 0;

  const submit = () => onSubmit({
    date,
    rank: Number(rank) || 1,
    count: Number(count) || 1,
    grade,
  });

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#F2F2F7', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', paddingBottom: 24,
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{titleMap[kind!]}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.gray, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ height: 1, background: '#E0E0E0' }} />

        <div style={{ padding: 20 }}>
          {/* 날짜 */}
          <Label>날짜</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

          {/* 순위 */}
          {(kind === 'rank' || kind === 'past') && (
            <>
              <Label>순위</Label>
              <input
                type="number" min={1} value={rank}
                onChange={e => setRank(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 5"
                style={inputStyle}
              />
            </>
          )}

          {/* 승진자 수 */}
          {kind === 'promo' && (
            <>
              <Label>승진자 수</Label>
              <input
                type="number" min={1} value={count}
                onChange={e => setCount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 2"
                style={inputStyle}
              />
            </>
          )}

          {/* 직급 */}
          {kind === 'promotion' && (
            <>
              <Label>직급</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {RANKS.map(r => (
                  <button key={r} onClick={() => setGrade(r)} style={{
                    padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: grade === r ? 700 : 500, fontSize: 14,
                    background: grade === r ? C.blue : '#F3F4F6',
                    color: grade === r ? '#fff' : '#374151',
                  }}>{r}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 저장 버튼 */}
        <div style={{ padding: '0 20px' }}>
          <button
            onClick={submit} disabled={!canSave}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
              background: !canSave ? '#D1D5DB' : kind === 'promotion' ? C.green : C.blue,
              color: '#fff', fontSize: 17, fontWeight: 600,
              cursor: canSave ? 'pointer' : 'default',
            }}
          >{kind === 'promotion' ? '승진 처리' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}

// ── 스타일 헬퍼 ──────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
  padding: '16px 20px', marginBottom: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: 12,
  border: `1px solid ${C.border}`, background: '#fff',
  fontSize: 15, color: C.text, marginBottom: 16,
  boxSizing: 'border-box', outline: 'none',
};

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>{children}</div>;
}

function inlineBtn(color: string): React.CSSProperties {
  return { background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color, cursor: 'pointer', padding: '2px 6px' };
}
