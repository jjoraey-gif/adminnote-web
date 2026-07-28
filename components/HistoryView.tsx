'use client';

import { useState } from 'react';
import {
  PromotionRecord, AssignmentRecord, AwardRecord, CareerInfo,
} from '@/lib/useWebStore';

// ── 색상 ──────────────────────────────────────────────────────────────────────
const C = {
  blue: '#2563EB', green: '#16A34A', orange: '#D97706', gray: '#8E8E93',
  bg: '#F2F2F7', card: '#fff', border: '#E5E7EB', text: '#1C1C1E',
};
const DOT = { purple: '#A78BFA', green: '#6EE7B7', pink: '#F9A8D4' };
const RANKS = ['9급', '8급', '7급', '6급', '5급', '4급'];

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function careerDays(ci: CareerInfo): number {
  const s = parseDate(ci.startDate);
  return s ? daysBetween(s, new Date()) : 0;
}

function careerYearsMonths(ci: CareerInfo): [number, number] {
  const s = parseDate(ci.startDate);
  if (!s) return [0, 0];
  const now = new Date();
  let y = now.getFullYear() - s.getFullYear();
  let m = now.getMonth() - s.getMonth();
  if (m < 0) { y--; m += 12; }
  return [y, m];
}

function sortedPromotions(p: PromotionRecord[]) {
  return [...p].sort((a, b) => b.date.localeCompare(a.date));
}
function sortedAssignments(a: AssignmentRecord[]) {
  return [...a].sort((a, b) => b.date.localeCompare(a.date));
}
function sortedAwards(a: AwardRecord[]) {
  return [...a].sort((a, b) => b.date.localeCompare(a.date));
}
function currentGrade(promotions: PromotionRecord[]): string {
  return sortedPromotions(promotions)[0]?.grade ?? '[미입력]';
}
function daysSinceLastPromotion(promotions: PromotionRecord[]): number {
  const d = parseDate(sortedPromotions(promotions)[0]?.date);
  return d ? daysBetween(d, new Date()) : 0;
}

function calcDuration(startStr: string, endStr: string): string {
  const s = parseDate(startStr), e = parseDate(endStr);
  if (!s || !e) return '';
  let years = e.getFullYear() - s.getFullYear();
  let months = e.getMonth() - s.getMonth();
  if (e.getDate() < s.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years > 0 && months > 0) return `${years}년 ${months}개월`;
  if (years > 0) return `${years}년`;
  if (months > 0) return `${months}개월`;
  return '1개월 미만';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  promotions: PromotionRecord[];
  assignments: AssignmentRecord[];
  awards: AwardRecord[];
  careerInfo: CareerInfo;
  onAddPromotion: (p: PromotionRecord) => void;
  onUpdatePromotion: (p: PromotionRecord) => void;
  onDeletePromotion: (id: string) => void;
  onAddAssignment: (a: AssignmentRecord) => void;
  onUpdateAssignment: (a: AssignmentRecord) => void;
  onDeleteAssignment: (id: string) => void;
  onAddAward: (a: AwardRecord) => void;
  onUpdateAward: (a: AwardRecord) => void;
  onDeleteAward: (id: string) => void;
  onUpdateCareerInfo: (ci: CareerInfo) => void;
}

type FormKind = 'promotion' | 'assignment' | 'award' | 'career' | 'step' | null;

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function HistoryView({
  promotions, assignments, awards, careerInfo,
  onAddPromotion, onUpdatePromotion, onDeletePromotion,
  onAddAssignment, onUpdateAssignment, onDeleteAssignment,
  onAddAward, onUpdateAward, onDeleteAward,
  onUpdateCareerInfo,
}: Props) {
  const [form, setForm] = useState<FormKind>(null);
  const [editing, setEditing] = useState<any>(null);

  const sp = sortedPromotions(promotions);
  const sa = sortedAssignments(assignments);
  const sw = sortedAwards(awards);

  const cd = careerDays(careerInfo);
  const [cy, cm] = careerYearsMonths(careerInfo);
  const promoDays = daysSinceLastPromotion(promotions);
  const grade = currentGrade(promotions);

  const open = (kind: FormKind, rec: any = null) => { setEditing(rec); setForm(kind); };
  const close = () => { setForm(null); setEditing(null); };

  const handleDelete = (label: string, onOk: () => void) => {
    if (confirm(`'${label}'을 삭제하시겠습니까?`)) onOk();
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* 스탯 카드 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <StatCard
          label="공직 생활"
          big={cd > 0 ? `${cd}일` : '0일'}
          sub={(cy > 0 || cm > 0) ? `${cy}년 ${cm}개월` : '입직일 미설정'}
          color={C.blue}
        />
        <StatCard
          label="직급 / 호봉"
          big={careerInfo.stepGrade > 0 ? `${grade} ${careerInfo.stepGrade}호봉` : '미설정'}
          sub={careerInfo.nextStepUpDate ? `승급일 ${careerInfo.nextStepUpDate}` : '승급일 미설정'}
          color={C.green}
          onClick={() => open('step')}
          clickable
        />
        <StatCard
          label="현 직급 승진 후"
          big={promoDays > 0 ? `${promoDays}일` : '0일'}
          sub={promoDays > 0 ? `${Math.floor(promoDays / 365)}년 ${Math.floor((promoDays % 365) / 30)}개월` : grade}
          color={C.orange}
        />
        <StatCard
          label="입직일"
          big={careerInfo.startDate ?? 'YYYY-MM-DD'}
          sub={cd > 0 ? `${Math.floor(cd / 365)}년 ${Math.floor((cd % 365) / 30)}개월` : careerInfo.initialGrade}
          color={C.text}
          onClick={() => open('career')}
          clickable
        />
      </div>

      {/* 승진 이력 */}
      <SectionHeader title="승진 이력" onAdd={() => open('promotion')} />
      <SectionCard empty={sp.length === 0} emptyText="등록된 승진 이력이 없습니다.">
        {sp.map((r, i) => (
          <Row
            key={r.id} dot={DOT.purple}
            title={r.grade} subtitle={r.note || '승진'} date={r.date}
            last={i === sp.length - 1}
            onEdit={() => open('promotion', r)}
            onDelete={() => handleDelete(r.grade, () => onDeletePromotion(r.id))}
          />
        ))}
      </SectionCard>

      {/* 발령 이력 */}
      <SectionHeader title="발령 이력" onAdd={() => open('assignment')} />
      <SectionCard empty={sa.length === 0} emptyText="등록된 발령 이력이 없습니다.">
        {sa.map((r, i) => {
          const endS = i === 0 ? todayStr() : sa[i - 1].date;
          return (
            <Row
              key={r.id} dot={i === 0 ? DOT.green : '#9CA3AF'}
              title={r.department} badge={i === 0 ? '현부서' : undefined}
              subtitle={calcDuration(r.date, endS)} date={r.date}
              last={i === sa.length - 1}
              onEdit={() => open('assignment', r)}
              onDelete={() => handleDelete(r.department, () => onDeleteAssignment(r.id))}
            />
          );
        })}
      </SectionCard>

      {/* 포상 이력 */}
      <SectionHeader title="포상 이력" onAdd={() => open('award')} />
      <SectionCard empty={sw.length === 0} emptyText="등록된 포상 이력이 없습니다.">
        {sw.map((r, i) => (
          <Row
            key={r.id} dot={DOT.pink}
            title={r.name} subtitle={r.grade} date={r.date}
            last={i === sw.length - 1}
            onEdit={() => open('award', r)}
            onDelete={() => handleDelete(r.name, () => onDeleteAward(r.id))}
          />
        ))}
      </SectionCard>

      {/* 폼 모달 */}
      {form && (
        <FormModal
          kind={form} editing={editing} careerInfo={careerInfo}
          onClose={close}
          onAddPromotion={onAddPromotion} onUpdatePromotion={onUpdatePromotion}
          onAddAssignment={onAddAssignment} onUpdateAssignment={onUpdateAssignment}
          onAddAward={onAddAward} onUpdateAward={onUpdateAward}
          onUpdateCareerInfo={onUpdateCareerInfo}
        />
      )}
    </div>
  );
}

// ── 스탯 카드 ─────────────────────────────────────────────────────────────────
function StatCard({ label, big, sub, color, onClick, clickable }: {
  label: string; big: string; sub: string; color: string;
  onClick?: () => void; clickable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card, borderRadius: 14, padding: '16px 18px',
        border: `1px solid ${C.border}`,
        cursor: clickable ? 'pointer' : 'default',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: clickable ? 'box-shadow 0.15s' : undefined,
      }}
      onMouseEnter={e => clickable && ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={e => clickable && ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
    >
      <div style={{ fontSize: 12, color: C.gray, marginBottom: 6 }}>{label}{clickable && <span style={{ fontSize: 11, marginLeft: 4, color: '#CBD5E1' }}>✎</span>}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 4 }}>{big}</div>
      <div style={{ fontSize: 12, color: C.gray }}>{sub}</div>
    </div>
  );
}

// ── 섹션 헤더 ─────────────────────────────────────────────────────────────────
function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 4 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</span>
      <button
        onClick={onAdd}
        style={{ background: 'none', border: 'none', fontSize: 26, fontWeight: 300, color: C.text, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
      >＋</button>
    </div>
  );
}

// ── 섹션 카드 ─────────────────────────────────────────────────────────────────
function SectionCard({ empty, emptyText, children }: { empty: boolean; emptyText: string; children?: React.ReactNode }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {empty ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#C7C7CC', fontSize: 14 }}>{emptyText}</div>
      ) : (
        <div style={{ paddingTop: 4, paddingBottom: 4 }}>{children}</div>
      )}
    </div>
  );
}

// ── 행 ───────────────────────────────────────────────────────────────────────
function Row({ dot, title, badge, subtitle, date, last, onEdit, onDelete }: {
  dot: string; title: string; badge?: string; subtitle?: string;
  date?: string; last: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', padding: '12px 20px',
          borderBottom: last ? 'none' : `1px solid ${C.border}`,
          cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, marginRight: 14, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
            {badge && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#DCFCE7', color: C.green }}>{badge}</span>
            )}
          </div>
          {subtitle && <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {date && <span style={{ fontSize: 13, color: C.gray, marginLeft: 12, flexShrink: 0 }}>{date}</span>}
        <span style={{ fontSize: 12, color: '#D1D5DB', marginLeft: 8 }}>···</span>
      </div>

      {/* 수정/삭제 모달 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
              width: '100%', maxWidth: 600, overflow: 'hidden', paddingBottom: 8,
            }}
          >
            <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
              {date && <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{date}</div>}
            </div>
            <button onClick={() => { setOpen(false); onEdit(); }} style={actionBtnStyle('#1C1C1E')}>수정</button>
            <button onClick={() => { setOpen(false); onDelete(); }} style={actionBtnStyle('#EF4444')}>삭제</button>
            <div style={{ height: 8 }} />
            <button onClick={() => setOpen(false)} style={{ ...actionBtnStyle('#6B7280'), fontWeight: 400 }}>취소</button>
          </div>
        </div>
      )}
    </>
  );
}

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    display: 'block', width: '100%', padding: '16px 20px',
    background: 'none', border: 'none', textAlign: 'center',
    fontSize: 16, fontWeight: 600, color, cursor: 'pointer',
    borderBottom: `1px solid #F3F4F6`,
  };
}

// ── 폼 모달 ──────────────────────────────────────────────────────────────────
function FormModal({ kind, editing, careerInfo, onClose,
  onAddPromotion, onUpdatePromotion, onAddAssignment, onUpdateAssignment,
  onAddAward, onUpdateAward, onUpdateCareerInfo,
}: {
  kind: Exclude<FormKind, null>; editing: any; careerInfo: CareerInfo; onClose: () => void;
  onAddPromotion: (p: PromotionRecord) => void; onUpdatePromotion: (p: PromotionRecord) => void;
  onAddAssignment: (a: AssignmentRecord) => void; onUpdateAssignment: (a: AssignmentRecord) => void;
  onAddAward: (a: AwardRecord) => void; onUpdateAward: (a: AwardRecord) => void;
  onUpdateCareerInfo: (ci: CareerInfo) => void;
}) {
  const initDate = (kind === 'career' ? careerInfo.startDate : kind === 'step' ? careerInfo.nextStepUpDate : editing?.date) ?? todayStr();

  const [date, setDate] = useState(initDate);
  const [grade, setGrade] = useState<string>(editing?.grade ?? '');
  const [note, setNote] = useState(editing?.note ?? '승진');
  const [dept, setDept] = useState(editing?.department ?? '');
  const [awardName, setAwardName] = useState(editing?.name ?? '');
  const [awardGrade, setAwardGrade] = useState(editing?.grade ?? '');
  const [initialGrade, setInitialGrade] = useState(careerInfo.initialGrade || '9급');
  const [step, setStep] = useState(careerInfo.stepGrade > 0 ? careerInfo.stepGrade : 1);

  const titleMap: Record<string, string> = {
    promotion: `승진 이력 ${editing ? '수정' : '추가'}`,
    assignment: `발령 이력 ${editing ? '수정' : '추가'}`,
    award: `포상 이력 ${editing ? '수정' : '추가'}`,
    career: '공직 정보 설정',
    step: '직급/호봉 설정',
  };

  const canSave =
    kind === 'promotion' ? !!grade.trim() :
    kind === 'assignment' ? !!dept.trim() :
    kind === 'award' ? !!awardName.trim() : true;

  const save = () => {
    if (kind === 'promotion') {
      const r: PromotionRecord = { id: editing?.id ?? uuid(), grade: grade.trim(), date, note: note.trim() };
      editing ? onUpdatePromotion(r) : onAddPromotion(r);
    } else if (kind === 'assignment') {
      const r: AssignmentRecord = { id: editing?.id ?? uuid(), department: dept.trim(), date };
      editing ? onUpdateAssignment(r) : onAddAssignment(r);
    } else if (kind === 'award') {
      const r: AwardRecord = { id: editing?.id ?? uuid(), name: awardName.trim(), grade: awardGrade.trim(), date };
      editing ? onUpdateAward(r) : onAddAward(r);
    } else if (kind === 'career') {
      onUpdateCareerInfo({ ...careerInfo, startDate: date, initialGrade: initialGrade || '9급' });
    } else if (kind === 'step') {
      onUpdateCareerInfo({ ...careerInfo, stepGrade: step, nextStepUpDate: date });
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
          paddingBottom: 24,
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{titleMap[kind]}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.gray, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ height: 1, background: '#E0E0E0' }} />

        {/* 폼 내용 */}
        <div style={{ padding: 20 }}>
          {kind === 'promotion' && (
            <>
              <Label>직급</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {RANKS.map(r => (
                  <button key={r} onClick={() => setGrade(r)} style={{
                    padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: grade === r ? 700 : 500, fontSize: 14,
                    background: grade === r ? C.blue : '#F3F4F6', color: grade === r ? '#fff' : '#374151',
                  }}>{r}</button>
                ))}
              </div>
              <Label>메모</Label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="예: 승진" style={inputStyle} />
              <Label>날짜</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </>
          )}
          {kind === 'assignment' && (
            <>
              <Label>부서명</Label>
              <input value={dept} onChange={e => setDept(e.target.value)} placeholder="예: 정책기획과" style={inputStyle} />
              <Label>발령 날짜</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </>
          )}
          {kind === 'award' && (
            <>
              <Label>포상명</Label>
              <input value={awardName} onChange={e => setAwardName(e.target.value)} placeholder="예: 모범공무원상" style={inputStyle} />
              <Label>훈격</Label>
              <input value={awardGrade} onChange={e => setAwardGrade(e.target.value)} placeholder="예: 시장상" style={inputStyle} />
              <Label>수여 날짜</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </>
          )}
          {kind === 'career' && (
            <>
              <Label>입직일</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              <Label>최초 임용 직급</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['9급', '8급', '7급', '6급', '5급'].map(g => (
                  <button key={g} onClick={() => setInitialGrade(g)} style={{
                    padding: '10px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14,
                    fontWeight: initialGrade === g ? 700 : 400,
                    background: initialGrade === g ? C.blue : '#fff', color: initialGrade === g ? '#fff' : '#333',
                  }}>{g}</button>
                ))}
              </div>
            </>
          )}
          {kind === 'step' && (
            <>
              <Label>호봉</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setStep(v => Math.max(1, v - 1))} style={stepBtnStyle}>－</button>
                <span style={{ fontSize: 24, fontWeight: 700, minWidth: 80, textAlign: 'center' }}>{step}호봉</span>
                <button onClick={() => setStep(v => Math.min(40, v + 1))} style={stepBtnStyle}>＋</button>
              </div>
              <Label>다음 호봉 승급일</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </>
          )}
        </div>

        {/* 저장 버튼 */}
        <div style={{ padding: '0 20px' }}>
          <button
            onClick={save} disabled={!canSave}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
              background: canSave ? C.blue : '#D1D5DB', color: '#fff',
              fontSize: 17, fontWeight: 600, cursor: canSave ? 'pointer' : 'default',
            }}
          >저장</button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: 12,
  border: `1px solid ${C.border}`, background: '#fff',
  fontSize: 15, color: C.text, marginBottom: 16, boxSizing: 'border-box',
  outline: 'none',
};

const stepBtnStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 22, border: `1px solid ${C.border}`,
  background: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};
