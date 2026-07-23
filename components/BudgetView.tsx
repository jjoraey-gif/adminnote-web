'use client';

import { useState, useRef } from 'react';
import { SubProject, Pyeonsongmok, Seomok, colorHex, comma } from '@/lib/useSnapshot';
import { pyeonsongmokMasterList, PyeonsongmokMaster, masterFullName } from '@/lib/budgetMasterList';

// ── helpers ──────────────────────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function spBudget(sp: SubProject) { return sp.pyeonsongmoks.reduce((a, pm) => a + pmBudget(pm), 0); }
function spSpent(sp: SubProject) { return sp.pyeonsongmoks.reduce((a, pm) => a + pmSpent(pm), 0); }
function pmBudget(pm: Pyeonsongmok) { return pm.seomoks.reduce((a, s) => a + s.budgetAmount, 0); }
function pmSpent(pm: Pyeonsongmok) { return pm.seomoks.reduce((a, s) => a + s.spentAmount, 0); }
function execRate(budget: number, spent: number) { return budget > 0 ? Math.min(100, (spent / budget) * 100) : 0; }
function inThousands(won: number) { return comma(Math.trunc(won / 1000)); }
function seomokRatioText(s: Seomok) {
  const parts: string[] = [];
  if (s.nationalRatio > 0) parts.push(`국 ${s.nationalRatio}`);
  if (s.provincialRatio > 0) parts.push(`도 ${s.provincialRatio}`);
  if (s.cityRatio > 0) parts.push(`시 ${s.cityRatio}`);
  if ((s.districtRatio ?? 0) > 0) parts.push(`구 ${s.districtRatio}`);
  if ((s.countyRatio ?? 0) > 0) parts.push(`군 ${s.countyRatio}`);
  return parts.length ? `(${parts.join(' / ')})` : '';
}
function newSeomok(p: Partial<Seomok> = {}): Seomok {
  return { id: uuid(), code: '', name: '', budgetAmount: 0, spentAmount: 0, nationalRatio: 0, provincialRatio: 0, cityRatio: 0, districtRatio: 0, countyRatio: 0, ...p };
}
function newPyeonsongmok(p: Partial<Pyeonsongmok> = {}): Pyeonsongmok {
  return { id: uuid(), code: '', name: '', seomoks: [], ...p };
}
function newSubProject(p: Partial<SubProject> = {}): SubProject {
  return { id: uuid(), name: '', color: 'blue', sortOrder: 0, pyeonsongmoks: [], ...p };
}

const COLOR_OPTIONS = ['blue', 'green', 'red', 'yellow', 'pink', 'purple', 'orange'];

interface Props {
  subProjects: SubProject[];
  onAddSubProject: (sp: SubProject) => void;
  onUpdateSubProject: (sp: SubProject) => void;
  onDeleteSubProject: (id: string) => void;
  onReorderSubProjects: (ids: string[]) => void;
  onAddSpent: (spId: string, pmId: string, smId: string, delta: number) => void;
  onUpdateSpent: (spId: string, pmId: string, smId: string, spent: number) => void;
}

// ── Overlay (drag-safe modal wrapper) ────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onMouseDown={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({
  title, onClose, onSave, saveLabel = '저장', canSave = true, children,
}: {
  title: string; onClose: () => void; onSave?: () => void;
  saveLabel?: string; canSave?: boolean; children: React.ReactNode;
}) {
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 480, maxWidth: '95vw',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid #E5E7EB',
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {children}
        </div>
        {onSave && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #E5E7EB' }}>
            <button
              onClick={canSave ? onSave : undefined}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: canSave ? '#2563EB' : '#E5E7EB',
                color: canSave ? '#fff' : '#9CA3AF',
                fontSize: 15, fontWeight: 600, cursor: canSave ? 'pointer' : 'default',
              }}
            >
              {saveLabel}
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ── Field input ───────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, numeric, placeholder, required,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  numeric?: boolean; placeholder?: string; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 5 }}>
          {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
        </div>
      )}
      <input
        type={numeric ? 'number' : 'text'}
        value={value}
        onChange={e => onChange(numeric ? e.target.value.replace(/[^0-9]/g, '') : e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10,
          border: '1px solid #E5E7EB', fontSize: 14, color: '#1C1C1E',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: '#E5E7EB', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height / 2, transition: 'width 0.3s' }} />
    </div>
  );
}

// ── Add SubProject Modal ──────────────────────────────────────────────────────
function AddSubProjectModal({ onClose, onSave }: { onClose: () => void; onSave: (sp: SubProject) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [pms, setPms] = useState<{ pm: Pyeonsongmok; budget: string; nat: string; prov: string; city: string; district: string; county: string }[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const buildSp = (): SubProject => {
    const pyeonsongmoks = pms.map(({ pm, budget, nat, prov, city, district, county }) => {
      const b = (Number(budget) || 0) * 1000;
      const sm0 = pm.seomoks[0];
      const has = b > 0 || nat || prov || city || district || county;
      return newPyeonsongmok({
        code: pm.code, name: pm.name,
        seomoks: has ? [newSeomok({
          code: sm0?.code || pm.code, name: sm0?.name || pm.name,
          budgetAmount: b,
          nationalRatio: Number(nat) || 0, provincialRatio: Number(prov) || 0,
          cityRatio: Number(city) || 0, districtRatio: Number(district) || 0, countyRatio: Number(county) || 0,
        })] : [],
      });
    });
    return newSubProject({ name: name.trim(), color, pyeonsongmoks });
  };

  return (
    <>
      <ModalShell title="세부사업 추가" onClose={onClose} onSave={() => { onSave(buildSp()); onClose(); }} saveLabel="추가" canSave={!!name.trim()}>
        <Field label="세부사업명" value={name} onChange={setName} placeholder="예: 청년정책네트워크 운영" required />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>색상</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(c => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: 14, backgroundColor: colorHex(c), cursor: 'pointer',
                  border: color === c ? `3px solid #1C1C1E` : '3px solid transparent',
                }}
              />
            ))}
          </div>
        </div>
        {pms.map((row, i) => (
          <div key={row.pm.id} style={{ background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#1C1C1E', fontSize: 13 }}>
                {row.pm.seomoks[0] ? `${row.pm.seomoks[0].code} ${row.pm.seomoks[0].name}` : `${row.pm.code} ${row.pm.name}`}
              </span>
              <button onClick={() => setPms(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>{row.pm.code} {row.pm.name}</div>
            <Field value={row.budget} onChange={v => setPms(p => p.map((x, idx) => idx === i ? { ...x, budget: v } : x))} numeric placeholder="편성금액(천원)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <Field value={row.nat} onChange={v => setPms(p => p.map((x, idx) => idx === i ? { ...x, nat: v } : x))} numeric placeholder="국비%" />
              <Field value={row.prov} onChange={v => setPms(p => p.map((x, idx) => idx === i ? { ...x, prov: v } : x))} numeric placeholder="도비%" />
              <Field value={row.city} onChange={v => setPms(p => p.map((x, idx) => idx === i ? { ...x, city: v } : x))} numeric placeholder="시비%" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <Field value={row.district} onChange={v => setPms(p => p.map((x, idx) => idx === i ? { ...x, district: v } : x))} numeric placeholder="구비%" />
              <Field value={row.county} onChange={v => setPms(p => p.map((x, idx) => idx === i ? { ...x, county: v } : x))} numeric placeholder="군비%" />
              <div />
            </div>
          </div>
        ))}
        <button
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%', padding: '11px', borderRadius: 12, border: '1px dashed #D1D5DB',
            background: '#F9FAFB', color: '#2563EB', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          ＋ 통계목 추가
        </button>
      </ModalShell>
      {showPicker && (
        <AddPmModal
          existingCodes={pms.map(p => p.pm.code)}
          onClose={() => setShowPicker(false)}
          onPick={pm => { setPms(p => [...p, { pm, budget: '', nat: '', prov: '', city: '', district: '', county: '' }]); setShowPicker(false); }}
        />
      )}
    </>
  );
}

// ── Edit SubProject Modal ─────────────────────────────────────────────────────
function EditSubProjectModal({ sp, onClose, onSave }: { sp: SubProject; onClose: () => void; onSave: (sp: SubProject) => void }) {
  const [name, setName] = useState(sp.name);
  const [color, setColor] = useState(sp.color);
  return (
    <ModalShell title="세부사업 수정" onClose={onClose} onSave={() => { onSave({ ...sp, name: name.trim(), color }); onClose(); }} canSave={!!name.trim()}>
      <Field label="세부사업명" value={name} onChange={setName} required />
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>색상</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {COLOR_OPTIONS.map(c => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28, borderRadius: 14, backgroundColor: colorHex(c), cursor: 'pointer',
                border: color === c ? '3px solid #1C1C1E' : '3px solid transparent',
              }}
            />
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Add Pyeonsongmok Modal ────────────────────────────────────────────────────
function AddPmModal({ existingCodes, onClose, onPick }: { existingCodes: string[]; onClose: () => void; onPick: (pm: Pyeonsongmok) => void }) {
  const [master, setMaster] = useState<PyeonsongmokMaster | null>(null);
  const available = pyeonsongmokMasterList.filter(m => !existingCodes.includes(m.code));

  return (
    <ModalShell title={master ? '통계목 선택' : '편성목 추가'} onClose={master ? () => setMaster(null) : onClose}>
      {!master ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {available.map(m => (
            <button
              key={m.code}
              onClick={() => {
                if (m.seomoks.length === 0) onPick(newPyeonsongmok({ code: m.code, name: m.name }));
                else setMaster(m);
              }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px', borderRadius: 10, border: 'none', background: '#F9FAFB',
                cursor: 'pointer', fontSize: 14, color: '#1C1C1E', textAlign: 'left',
              }}
            >
              <span>{masterFullName(m)}</span>
              <span style={{ color: '#9CA3AF', fontSize: 12 }}>{m.seomoks.length ? `통계목 ${m.seomoks.length}개 ›` : '＋'}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {master.seomoks.map(([code, name]) => (
            <button
              key={code}
              onClick={() => onPick(newPyeonsongmok({ code: master.code, name: master.name, seomoks: [newSeomok({ code, name })] }))}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px', borderRadius: 10, border: 'none', background: '#F9FAFB',
                cursor: 'pointer', fontSize: 14, color: '#1C1C1E', textAlign: 'left',
              }}
            >
              <span>{code} {name}</span>
              <span style={{ color: '#2563EB' }}>＋</span>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ── Add Seomok Modal ──────────────────────────────────────────────────────────
function AddSeomokModal({ pmCode, pmName, existingCodes, onClose, onSave }: {
  pmCode: string; pmName: string; existingCodes: string[]; onClose: () => void; onSave: (sm: Seomok) => void;
}) {
  const master = pyeonsongmokMasterList.find(m => m.code === pmCode);
  const masterSeomoks = (master?.seomoks ?? []).filter(([c]) => !existingCodes.includes(c));
  const [manual, setManual] = useState(masterSeomoks.length === 0);
  const [code, setCode] = useState(masterSeomoks[0]?.[0] ?? '');
  const [name, setName] = useState(masterSeomoks[0]?.[1] ?? '');
  const [budget, setBudget] = useState('');
  const [nat, setNat] = useState(''); const [prov, setProv] = useState(''); const [city, setCity] = useState('');
  const [district, setDistrict] = useState(''); const [county, setCounty] = useState('');

  return (
    <ModalShell
      title="통계목 추가"
      onClose={onClose}
      canSave={!!name.trim()}
      onSave={() => onSave(newSeomok({
        code: code.trim(), name: name.trim(),
        budgetAmount: (Number(budget) || 0) * 1000,
        nationalRatio: Number(nat) || 0, provincialRatio: Number(prov) || 0,
        cityRatio: Number(city) || 0, districtRatio: Number(district) || 0, countyRatio: Number(county) || 0,
      }))}
    >
      {!manual && masterSeomoks.length > 0 ? (
        <>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>통계목 선택 ({pmName})</div>
          {masterSeomoks.map(([c, n]) => (
            <button
              key={c}
              onClick={() => { setCode(c); setName(n); }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: code === c ? '2px solid #2563EB' : '1px solid #E5E7EB',
                background: code === c ? '#EFF6FF' : '#F9FAFB',
                cursor: 'pointer', fontSize: 14, color: '#1C1C1E', marginBottom: 4,
              }}
            >
              <span>{c} {n}</span>
              {code === c && <span style={{ color: '#2563EB' }}>✓</span>}
            </button>
          ))}
          <button onClick={() => { setManual(true); setCode(''); setName(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>직접 입력</button>
        </>
      ) : (
        <>
          <Field label="코드" value={code} onChange={setCode} placeholder="01" />
          <Field label="통계목명" value={name} onChange={setName} required />
        </>
      )}
      <div style={{ height: 1, background: '#E5E7EB', margin: '12px 0' }} />
      <Field label="편성액 (원)" value={budget} onChange={setBudget} numeric placeholder="0" />
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>재원 비율 (%)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
        <Field value={nat} onChange={setNat} numeric placeholder="국비%" />
        <Field value={prov} onChange={setProv} numeric placeholder="도비%" />
        <Field value={city} onChange={setCity} numeric placeholder="시비%" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Field value={district} onChange={setDistrict} numeric placeholder="구비%" />
        <Field value={county} onChange={setCounty} numeric placeholder="군비%" />
        <div />
      </div>
    </ModalShell>
  );
}

// ── Edit Seomok Modal ─────────────────────────────────────────────────────────
function EditSeomokModal({ sm, onClose, onSave }: { sm: Seomok; onClose: () => void; onSave: (s: Seomok) => void }) {
  const [budget, setBudget] = useState(sm.budgetAmount ? String(sm.budgetAmount) : '');
  const [spent, setSpent] = useState(sm.spentAmount ? String(sm.spentAmount) : '');
  const [nat, setNat] = useState(sm.nationalRatio ? String(sm.nationalRatio) : '');
  const [prov, setProv] = useState(sm.provincialRatio ? String(sm.provincialRatio) : '');
  const [city, setCity] = useState(sm.cityRatio ? String(sm.cityRatio) : '');
  const [district, setDistrict] = useState(sm.districtRatio ? String(sm.districtRatio) : '');
  const [county, setCounty] = useState(sm.countyRatio ? String(sm.countyRatio) : '');

  return (
    <ModalShell
      title={`${sm.code} ${sm.name} 수정`}
      onClose={onClose}
      onSave={() => onSave({ ...sm, budgetAmount: Number(budget) || 0, spentAmount: Number(spent) || 0, nationalRatio: Number(nat) || 0, provincialRatio: Number(prov) || 0, cityRatio: Number(city) || 0, districtRatio: Number(district) || 0, countyRatio: Number(county) || 0 })}
    >
      <Field label="편성액 (원)" value={budget} onChange={setBudget} numeric />
      <Field label="지출액 (원)" value={spent} onChange={setSpent} numeric />
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>재원 비율 (%)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
        <Field value={nat} onChange={setNat} numeric placeholder="국비%" />
        <Field value={prov} onChange={setProv} numeric placeholder="도비%" />
        <Field value={city} onChange={setCity} numeric placeholder="시비%" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Field value={district} onChange={setDistrict} numeric placeholder="구비%" />
        <Field value={county} onChange={setCounty} numeric placeholder="군비%" />
        <div />
      </div>
    </ModalShell>
  );
}

// ── Spent Modal ───────────────────────────────────────────────────────────────
function SpentModal({ sm, onClose, onSave }: { sm: Seomok; onClose: () => void; onSave: (delta: number) => void }) {
  const [refund, setRefund] = useState(false);
  const [amount, setAmount] = useState('');
  const canSave = (Number(amount) || 0) > 0;
  return (
    <ModalShell
      title="지출 입력"
      onClose={onClose}
      onSave={() => { const a = (Number(amount) || 0) * 1000; if (a > 0) onSave(refund ? -a : a); }}
      canSave={canSave}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>{sm.code} {sm.name}</div>
      <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
        편성 {inThousands(sm.budgetAmount)}천원 · 잔여 {inThousands(sm.budgetAmount - sm.spentAmount)}천원
      </div>
      <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {[{ r: false, l: '지출' }, { r: true, l: '반납 (−)' }].map(({ r, l }) => (
          <button
            key={l}
            onClick={() => setRefund(r)}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: refund === r ? '#2563EB' : 'transparent',
              color: refund === r ? '#fff' : '#374151',
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>금액(천원)</div>
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="0"
        style={{
          width: '100%', padding: '14px 12px', borderRadius: 10,
          border: '1px solid #E5E7EB', fontSize: 24, fontWeight: 600,
          color: '#1C1C1E', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </ModalShell>
  );
}

// ── SeomokRow ─────────────────────────────────────────────────────────────────
function SeomokRow({
  sp, pm, sm, color, onUpdateSp,
}: {
  sp: SubProject; pm: Pyeonsongmok; sm: Seomok; color: string;
  onUpdateSp: (sp: SubProject) => void;
}) {
  const [showSpent, setShowSpent] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rate = execRate(sm.budgetAmount, sm.spentAmount);
  const ratio = seomokRatioText(sm);

  const deleteSeomok = () => {
    if (!confirm(`'${sm.code} ${sm.name}' 통계목을 삭제하시겠습니까?`)) return;
    onUpdateSp({ ...sp, pyeonsongmoks: sp.pyeonsongmoks.map(p => p.id !== pm.id ? p : { ...p, seomoks: p.seomoks.filter(s => s.id !== sm.id) }) });
  };

  return (
    <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: '#D1D5DB', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{sm.code} {sm.name}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{inThousands(sm.budgetAmount)}천원</span>
            {ratio && <span style={{ fontSize: 11, color: '#60A5FA' }}>{ratio}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            집행 {inThousands(sm.spentAmount)}천원 · 잔액 {inThousands(sm.budgetAmount - sm.spentAmount)}천원
          </div>
        </div>
        <button
          onClick={() => setShowSpent(true)}
          style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: '#BFDBFE', color: '#1E40AF', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0,
          }}
        >
          지출
        </button>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF', padding: '0 4px' }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#fff',
              borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 90, overflow: 'hidden',
            }}>
              <button onClick={() => { setMenuOpen(false); setShowEdit(true); }} style={menuItemStyle}>수정</button>
              <button onClick={() => { setMenuOpen(false); deleteSeomok(); }} style={{ ...menuItemStyle, color: '#EF4444' }}>삭제</button>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <ProgressBar pct={rate} color={color} height={3} />
      </div>
      {showSpent && (
        <SpentModal
          sm={sm}
          onClose={() => setShowSpent(false)}
          onSave={delta => {
            onUpdateSp({ ...sp, pyeonsongmoks: sp.pyeonsongmoks.map(p => p.id !== pm.id ? p : { ...p, seomoks: p.seomoks.map(s => s.id === sm.id ? { ...s, spentAmount: s.spentAmount + delta } : s) }) });
            setShowSpent(false);
          }}
        />
      )}
      {showEdit && (
        <EditSeomokModal
          sm={sm}
          onClose={() => setShowEdit(false)}
          onSave={updated => {
            onUpdateSp({ ...sp, pyeonsongmoks: sp.pyeonsongmoks.map(p => p.id !== pm.id ? p : { ...p, seomoks: p.seomoks.map(s => s.id === sm.id ? updated : s) }) });
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}

// ── PmSection ─────────────────────────────────────────────────────────────────
function PmSection({
  sp, pm, color, onUpdateSp,
}: {
  sp: SubProject; pm: Pyeonsongmok; color: string;
  onUpdateSp: (sp: SubProject) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddSm, setShowAddSm] = useState(false);
  const budget = pmBudget(pm);
  const spent = pmSpent(pm);
  const rate = execRate(budget, spent);

  const deletePm = () => {
    if (!confirm(`'${pm.code} ${pm.name}' 편성목을 삭제하시겠습니까? 통계목 데이터도 함께 삭제됩니다.`)) return;
    onUpdateSp({ ...sp, pyeonsongmoks: sp.pyeonsongmoks.filter(p => p.id !== pm.id) });
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '11px 14px', background: '#F9FAFB', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <div style={{ width: 4, height: 28, borderRadius: 2, background: '#374151', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{pm.code} {pm.name}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            집행 {inThousands(spent)}천원 · 잔액 {inThousands(budget - spent)}천원 · {inThousands(budget)}천원
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', flexShrink: 0 }}>{rate.toFixed(0)}%</span>
        <button
          onClick={e => { e.stopPropagation(); deletePm(); }}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF', flexShrink: 0 }}
        >
          ⊖
        </button>
        <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      <ProgressBar pct={rate} color={color} height={2} />
      {expanded && (
        <>
          {pm.seomoks.map(sm => (
            <SeomokRow key={sm.id} sp={sp} pm={pm} sm={sm} color={color} onUpdateSp={onUpdateSp} />
          ))}
          <div style={{ padding: '8px 16px' }}>
            <button
              onClick={() => setShowAddSm(true)}
              style={{ background: 'none', border: 'none', color, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              ＋ 통계목 추가
            </button>
          </div>
        </>
      )}
      {showAddSm && (
        <AddSeomokModal
          pmCode={pm.code}
          pmName={`${pm.code} ${pm.name}`}
          existingCodes={pm.seomoks.map(s => s.code)}
          onClose={() => setShowAddSm(false)}
          onSave={sm => {
            onUpdateSp({ ...sp, pyeonsongmoks: sp.pyeonsongmoks.map(p => p.id !== pm.id ? p : { ...p, seomoks: [...p.seomoks, sm] }) });
            setShowAddSm(false);
          }}
        />
      )}
    </div>
  );
}

// ── SubProjectCard ────────────────────────────────────────────────────────────
function SubProjectCard({
  sp, onUpdateSp, onDeleteSp,
}: {
  sp: SubProject;
  onUpdateSp: (sp: SubProject) => void;
  onDeleteSp: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddPm, setShowAddPm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const color = colorHex(sp.color);
  const budget = spBudget(sp);
  const spent = spSpent(sp);
  const rate = execRate(budget, spent);

  const deleteSp = () => {
    if (!confirm(`'${sp.name}' 세부사업을 삭제하시겠습니까? 모든 편성 데이터가 함께 삭제됩니다.`)) return;
    onDeleteSp(sp.id);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E5E7EB', marginBottom: 12 }}>
      {/* 헤더 */}
      <div
        style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', background: color + '18', cursor: 'pointer', gap: 10 }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>{sp.name}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{inThousands(budget)}천원</span>
          </div>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: '#EF4444' }}>집행 {inThousands(spent)}천원</span>
            <span style={{ color: '#16A34A', marginLeft: 8 }}>잔액 {inThousands(budget - spent)}천원</span>
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color, flexShrink: 0 }}>{rate.toFixed(1)}%</span>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', padding: '0 6px' }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#fff',
              borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 90, overflow: 'hidden',
            }}>
              <button onClick={() => { setMenuOpen(false); setShowEdit(true); }} style={menuItemStyle}>수정</button>
              <button onClick={() => { setMenuOpen(false); deleteSp(); }} style={{ ...menuItemStyle, color: '#EF4444' }}>삭제</button>
            </div>
          )}
        </div>
        <span style={{ fontSize: 14, color: '#9CA3AF', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      <ProgressBar pct={rate} color={color} height={3} />

      {/* 편성목 목록 */}
      {expanded && (
        <div style={{ padding: '12px 12px 4px' }}>
          {sp.pyeonsongmoks.map(pm => (
            <PmSection key={pm.id} sp={sp} pm={pm} color={color} onUpdateSp={onUpdateSp} />
          ))}
          <div style={{ padding: '4px 4px 10px', textAlign: 'center' }}>
            <button
              onClick={() => setShowAddPm(true)}
              style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              ＋ 편성목 추가
            </button>
          </div>
        </div>
      )}

      {showEdit && <EditSubProjectModal sp={sp} onClose={() => setShowEdit(false)} onSave={onUpdateSp} />}
      {showAddPm && (
        <AddPmModal
          existingCodes={sp.pyeonsongmoks.map(p => p.code)}
          onClose={() => setShowAddPm(false)}
          onPick={pm => { onUpdateSp({ ...sp, pyeonsongmoks: [...sp.pyeonsongmoks, pm] }); setShowAddPm(false); }}
        />
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '10px 16px', border: 'none',
  background: '#fff', fontSize: 14, color: '#1C1C1E', cursor: 'pointer', textAlign: 'left',
};

// ── Main BudgetView ───────────────────────────────────────────────────────────
export default function BudgetView({
  subProjects,
  onAddSubProject, onUpdateSubProject, onDeleteSubProject, onReorderSubProjects,
  onAddSpent, onUpdateSpent,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const sorted = [...subProjects].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalBudget = sorted.reduce((a, sp) => a + spBudget(sp), 0);
  const totalSpent = sorted.reduce((a, sp) => a + spSpent(sp), 0);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 전체 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '총 예산', value: inThousands(totalBudget) + '천원', color: '#1C1C1E' },
          { label: '집행액', value: inThousands(totalSpent) + '천원', color: '#2563EB' },
          { label: '잔액', value: inThousands(totalBudget - totalSpent) + '천원', color: totalBudget - totalSpent < 0 ? '#EF4444' : '#16A34A' },
        ].map(item => (
          <div key={item.label} style={{ padding: '16px 20px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 전체 집행률 바 */}
      <div style={{ marginBottom: 20, padding: '14px 20px', background: '#F9FAFB', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>전체 집행률</span>
          <span style={{ fontWeight: 700, color: '#2563EB' }}>{execRate(totalBudget, totalSpent).toFixed(1)}%</span>
        </div>
        <ProgressBar pct={execRate(totalBudget, totalSpent)} color="#2563EB" height={10} />
      </div>

      {/* 세부사업 추가 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '9px 18px', borderRadius: 20, border: 'none',
            background: '#2563EB', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          ＋ 세부사업 추가
        </button>
      </div>

      {/* 세부사업 카드 목록 */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>
          등록된 예산이 없습니다. 세부사업을 추가해 보세요.
        </div>
      ) : (
        sorted.map(sp => (
          <SubProjectCard
            key={sp.id}
            sp={sp}
            onUpdateSp={onUpdateSubProject}
            onDeleteSp={onDeleteSubProject}
          />
        ))
      )}

      {showAdd && (
        <AddSubProjectModal
          onClose={() => setShowAdd(false)}
          onSave={sp => { onAddSubProject(sp); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
