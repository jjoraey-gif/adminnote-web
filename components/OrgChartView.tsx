'use client';

import { useState, useMemo } from 'react';
import { OrgDepartment, OrgTeam, OrgMember } from '@/lib/useWebStore';

// ── 색상 팔레트 ────────────────────────────────────────────────────────────────
const DEPT_COLORS = ['#185FA5', '#D97706', '#059669', '#9333EA', '#DC2626', '#0891B2', '#B45309'];
const AVATAR_COLORS = [
  { bg: '#E6F1FB', fg: '#185FA5' }, { bg: '#EAF3DE', fg: '#3B6D11' },
  { bg: '#EEEDFE', fg: '#3C3489' }, { bg: '#FCEBEB', fg: '#A32D2D' },
  { bg: '#FFF3CD', fg: '#854F0B' }, { bg: '#E1F5EE', fg: '#0F6E56' },
  { bg: '#FEF3C7', fg: '#B45309' },
];
const deptColor = (i: number) => DEPT_COLORS[i % DEPT_COLORS.length];
const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const POSITION_PRESETS = ['과장', '팀장', '주무관', '기타'];
const BLUE = '#185FA5';
const GRAY = '#9CA3AF';

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function initials(name: string) {
  if (!name) return '?';
  return name.length >= 2 ? name.slice(-2) : name[0];
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  orgDepartments: OrgDepartment[];
  onSetDepartments: (list: OrgDepartment[]) => void;
  onAddDepartment: (d: OrgDepartment) => void;
  onUpdateDepartment: (d: OrgDepartment) => void;
  onDeleteDepartment: (id: string) => void;
  onMoveMemberToTeam: (member: OrgMember, srcDeptId: string, srcTeamId: string, tgtDeptId: string, tgtTeamId: string) => void;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function OrgChartView({ orgDepartments: depts, onSetDepartments, onAddDepartment, onUpdateDepartment, onDeleteDepartment, onMoveMemberToTeam }: Props) {
  const [addingDept, setAddingDept] = useState(false);
  const [deptName, setDeptName] = useState('');

  const totalMembers = depts.reduce((sum, d) => sum + d.teams.reduce((s, t) => s + t.members.length, 0), 0);

  const moveDept = (id: string, off: number) => {
    const list = [...depts];
    const i = list.findIndex(d => d.id === id);
    const t = i + off;
    if (t < 0 || t >= list.length) return;
    [list[i], list[t]] = [list[t], list[i]];
    onSetDepartments(list);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {depts.length > 0 && (
          <span style={{ fontSize: 12, color: GRAY }}>{depts.length}개 과 · 구성원 {totalMembers}명</span>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setAddingDept(true)}
            style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >＋ 과 추가</button>
        </div>
      </div>

      {/* 빈 상태 */}
      {depts.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 10, color: GRAY }}>
          <div style={{ fontSize: 48 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#374151' }}>조직도가 없습니다</div>
          <div style={{ fontSize: 13 }}>과 추가 버튼으로 시작하세요</div>
        </div>
      )}

      {/* 과 목록 */}
      {depts.map((dept, idx) => (
        <DeptCard
          key={dept.id}
          dept={dept}
          allDepts={depts}
          color={deptColor(idx)}
          isFirst={idx === 0}
          isLast={idx === depts.length - 1}
          onMoveUp={() => moveDept(dept.id, -1)}
          onMoveDown={() => moveDept(dept.id, 1)}
          onUpdate={onUpdateDepartment}
          onDelete={() => { if (confirm(`"${dept.name}"을(를) 삭제할까요?\n모든 팀과 구성원이 함께 삭제됩니다.`)) onDeleteDepartment(dept.id); }}
          onMoveMember={onMoveMemberToTeam}
        />
      ))}

      {/* 과 추가 모달 */}
      {addingDept && (
        <InputModal
          title="과 추가"
          placeholder="예) 행정지원과"
          value={deptName}
          onChange={setDeptName}
          onClose={() => { setAddingDept(false); setDeptName(''); }}
          onSave={() => {
            if (deptName.trim()) {
              onAddDepartment({ id: uuid(), name: deptName.trim(), teams: [] });
              setDeptName(''); setAddingDept(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ── 과 카드 ───────────────────────────────────────────────────────────────────
function DeptCard({ dept, allDepts, color, isFirst, isLast, onMoveUp, onMoveDown, onUpdate, onDelete, onMoveMember }: {
  dept: OrgDepartment; allDepts: OrgDepartment[]; color: string;
  isFirst: boolean; isLast: boolean;
  onMoveUp: () => void; onMoveDown: () => void;
  onUpdate: (d: OrgDepartment) => void; onDelete: () => void;
  onMoveMember: (member: OrgMember, srcDeptId: string, srcTeamId: string, tgtDeptId: string, tgtTeamId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [addTeam, setAddTeam] = useState(false);
  const [teamName, setTeamName] = useState('');

  const totalMembers = dept.teams.reduce((s, t) => s + t.members.length, 0);
  const teamAvatarOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    dept.teams.forEach(t => { offsets.push(acc); acc += t.members.length; });
    return offsets;
  }, [dept.teams]);

  const moveTeam = (id: string, off: number) => {
    const list = [...dept.teams];
    const i = list.findIndex(t => t.id === id);
    const t = i + off;
    if (t < 0 || t >= list.length) return;
    [list[i], list[t]] = [list[t], list[i]];
    onUpdate({ ...dept, teams: list });
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 50 }}>
        <div style={{ width: 4, background: color, flexShrink: 0 }} />
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8, cursor: 'pointer' }}
          onClick={() => !showMenu && setExpanded(v => !v)}
        >
          <span style={{ fontSize: 16 }}>🏛</span>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{dept.name}</span>

          {showMenu ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: '4px 8px' }} onClick={e => e.stopPropagation()}>
              <InlineBtn color={BLUE} onClick={() => { setEditName(dept.name); setEditing(true); setShowMenu(false); }}>수정</InlineBtn>
              {!isFirst && <InlineBtn color={BLUE} onClick={() => { onMoveUp(); setShowMenu(false); }}>↑</InlineBtn>}
              {!isLast && <InlineBtn color={BLUE} onClick={() => { onMoveDown(); setShowMenu(false); }}>↓</InlineBtn>}
              <InlineBtn color="#EF4444" onClick={() => { setShowMenu(false); onDelete(); }}>삭제</InlineBtn>
              <InlineBtn color={GRAY} onClick={() => setShowMenu(false)}>✕</InlineBtn>
            </div>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: color + '22', color }}>{totalMembers}명</span>
              <button onClick={e => { e.stopPropagation(); setShowMenu(true); }} style={{ background: 'none', border: 'none', fontSize: 16, color: GRAY, cursor: 'pointer', padding: '2px 4px' }}>···</button>
              <span style={{ fontSize: 12, color: '#C7C7CC' }}>{expanded ? '▾' : '▸'}</span>
            </>
          )}
        </div>
      </div>

      {/* 바디 */}
      {expanded && (
        <div style={{ borderTop: '1px solid #E5E7EB', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dept.teams.map((team, ti) => (
            <TeamSection
              key={team.id}
              dept={dept}
              team={team}
              allDepts={allDepts}
              avatarOffset={teamAvatarOffsets[ti] ?? 0}
              isFirstTeam={ti === 0}
              isLastTeam={ti === dept.teams.length - 1}
              onMoveTeamUp={() => moveTeam(team.id, -1)}
              onMoveTeamDown={() => moveTeam(team.id, 1)}
              onUpdateTeam={t => onUpdate({ ...dept, teams: dept.teams.map(x => x.id === t.id ? t : x) })}
              onDeleteTeam={() => { if (confirm(`"${team.name}"을(를) 삭제할까요?`)) onUpdate({ ...dept, teams: dept.teams.filter(x => x.id !== team.id) }); }}
              onMoveMember={onMoveMember}
            />
          ))}
          <button
            onClick={() => setAddTeam(true)}
            style={{ padding: '9px 0', borderRadius: 10, border: '1px dashed #D1D5DB', background: 'none', color: GRAY, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >＋ 팀 추가</button>
        </div>
      )}

      {addTeam && (
        <InputModal title="팀 추가" placeholder="예) 총무팀" value={teamName} onChange={setTeamName}
          onClose={() => { setAddTeam(false); setTeamName(''); }}
          onSave={() => { if (teamName.trim()) { onUpdate({ ...dept, teams: [...dept.teams, { id: uuid(), name: teamName.trim(), members: [] }] }); setTeamName(''); setAddTeam(false); } }}
        />
      )}
      {editing && (
        <InputModal title="과 수정" placeholder="과 이름" value={editName} onChange={setEditName}
          onClose={() => setEditing(false)}
          onSave={() => { if (editName.trim()) { onUpdate({ ...dept, name: editName.trim() }); setEditing(false); } }}
        />
      )}
    </div>
  );
}

// ── 팀 섹션 ───────────────────────────────────────────────────────────────────
function TeamSection({ dept, team, allDepts, avatarOffset, isFirstTeam, isLastTeam, onMoveTeamUp, onMoveTeamDown, onUpdateTeam, onDeleteTeam, onMoveMember }: {
  dept: OrgDepartment; team: OrgTeam; allDepts: OrgDepartment[];
  avatarOffset: number; isFirstTeam: boolean; isLastTeam: boolean;
  onMoveTeamUp: () => void; onMoveTeamDown: () => void;
  onUpdateTeam: (t: OrgTeam) => void; onDeleteTeam: () => void;
  onMoveMember: (member: OrgMember, srcDeptId: string, srcTeamId: string, tgtDeptId: string, tgtTeamId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingTeam, setEditingTeam] = useState(false);
  const [addMember, setAddMember] = useState(false);
  const [editMember, setEditMember] = useState<OrgMember | null>(null);
  const [movingMember, setMovingMember] = useState<OrgMember | null>(null);

  // 이동 가능한 팀 목록
  const moveTargets = useMemo(() => {
    const targets: { label: string; deptId: string; teamId: string }[] = [];
    allDepts.forEach(d => d.teams.forEach(t => {
      if (t.id !== team.id) targets.push({ label: `${d.name} › ${t.name}`, deptId: d.id, teamId: t.id });
    }));
    return targets;
  }, [allDepts, team.id]);

  return (
    <div style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* 팀 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', gap: 8 }}>
        <span style={{ fontSize: 13 }}>👥</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#4B5563' }}>{team.name}</span>
        {showMenu ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#E5E7EB', borderRadius: 8, padding: '3px 6px' }}>
            <InlineBtn color={BLUE} onClick={() => { setEditName(team.name); setEditingTeam(true); setShowMenu(false); }}>수정</InlineBtn>
            {!isFirstTeam && <InlineBtn color={BLUE} onClick={() => { onMoveTeamUp(); setShowMenu(false); }}>↑</InlineBtn>}
            {!isLastTeam && <InlineBtn color={BLUE} onClick={() => { onMoveTeamDown(); setShowMenu(false); }}>↓</InlineBtn>}
            <InlineBtn color="#EF4444" onClick={() => { setShowMenu(false); onDeleteTeam(); }}>삭제</InlineBtn>
            <InlineBtn color={GRAY} onClick={() => setShowMenu(false)}>✕</InlineBtn>
          </div>
        ) : (
          <>
            <span style={{ fontSize: 11, color: GRAY }}>{team.members.length}명</span>
            <button onClick={() => setShowMenu(true)} style={{ background: 'none', border: 'none', fontSize: 15, color: '#C7C7CC', cursor: 'pointer', padding: '2px 4px' }}>⋯</button>
          </>
        )}
      </div>

      {/* 구성원 */}
      {team.members.map((m, mi) => {
        const ac = avatarColor(avatarOffset + mi);
        return (
          <MemberRow key={m.id} member={m} avatarBg={ac.bg} avatarFg={ac.fg}
            onClick={() => setEditMember(m)} />
        );
      })}

      {/* 팀원 추가 버튼 */}
      <button onClick={() => setAddMember(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', width: '100%', background: 'none', border: 'none', borderTop: '1px solid #E5E7EB', color: GRAY, fontSize: 12, cursor: 'pointer' }}>
        ＋ 팀원 추가
      </button>

      {addMember && (
        <MemberModal
          onClose={() => setAddMember(false)}
          onSave={mem => { onUpdateTeam({ ...team, members: [...team.members, mem] }); setAddMember(false); }}
        />
      )}
      {editMember && (
        <MemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSave={mem => { onUpdateTeam({ ...team, members: team.members.map(x => x.id === mem.id ? mem : x) }); setEditMember(null); }}
          onDelete={() => { onUpdateTeam({ ...team, members: team.members.filter(x => x.id !== editMember!.id) }); setEditMember(null); }}
          onMove={() => { const m = editMember!; setEditMember(null); setMovingMember(m); }}
        />
      )}
      {movingMember && (
        <MoveModal
          member={movingMember}
          targets={moveTargets}
          onClose={() => setMovingMember(null)}
          onMove={(tgtDeptId, tgtTeamId) => { onMoveMember(movingMember, dept.id, team.id, tgtDeptId, tgtTeamId); setMovingMember(null); }}
        />
      )}
      {editingTeam && (
        <InputModal title="팀 수정" placeholder="팀 이름" value={editName} onChange={setEditName}
          onClose={() => setEditingTeam(false)}
          onSave={() => { if (editName.trim()) { onUpdateTeam({ ...team, name: editName.trim() }); setEditingTeam(false); } }}
        />
      )}
    </div>
  );
}

// ── 구성원 행 ─────────────────────────────────────────────────────────────────
function MemberRow({ member, avatarBg, avatarFg, onClick }: { member: OrgMember; avatarBg: string; avatarFg: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 10, borderTop: '1px solid #E5E7EB', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F0F4FF'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      <div style={{ width: 34, height: 34, borderRadius: 17, background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: avatarFg }}>{initials(member.name)}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E' }}>{member.name}</div>
        {(member.position || member.mobilePhone || member.officePhone) && (
          <div style={{ fontSize: 11, color: GRAY, marginTop: 1 }}>
            {[member.position, member.mobilePhone || member.officePhone].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      {member.mobilePhone && (
        <a href={`tel:${member.mobilePhone.replace(/-/g, '')}`} onClick={e => e.stopPropagation()}
          style={{ width: 32, height: 32, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15 }}>
          📞
        </a>
      )}
    </div>
  );
}

// ── 구성원 추가/수정 모달 ─────────────────────────────────────────────────────
function MemberModal({ member, onClose, onSave, onDelete, onMove }: {
  member?: OrgMember; onClose: () => void;
  onSave: (m: OrgMember) => void; onDelete?: () => void; onMove?: () => void;
}) {
  const initPos = member?.position ?? '';
  const isPreset = (['과장', '팀장', '주무관'] as string[]).includes(initPos);
  const [name, setName] = useState(member?.name ?? '');
  const [selPos, setSelPos] = useState<string>(isPreset ? initPos : (initPos ? '기타' : ''));
  const [customPos, setCustomPos] = useState(isPreset ? '' : initPos);
  const [office, setOffice] = useState(member?.officePhone ?? '');
  const [mobile, setMobile] = useState(member?.mobilePhone ?? '');

  const finalPosition = selPos === '기타' ? customPos.trim() : selPos;

  const save = () => {
    if (!name.trim()) return;
    onSave({ id: member?.id ?? uuid(), name: name.trim(), position: finalPosition, officePhone: office.trim(), mobilePhone: mobile.trim() });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>{member ? '구성원 수정' : '구성원 추가'}</span>
          {member && onDelete && (
            <button onClick={onDelete} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 }} title="삭제">🗑</button>
          )}
        </div>

        <FieldLabel>이름</FieldLabel>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="이름" style={inputSt} autoFocus />

        <FieldLabel>직위</FieldLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {POSITION_PRESETS.map(p => (
            <button key={p} onClick={() => setSelPos(p)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${selPos === p ? BLUE : '#E5E5EA'}`,
              background: selPos === p ? '#E6F1FB' : '#F9FAFB', color: selPos === p ? BLUE : GRAY,
              fontWeight: selPos === p ? 600 : 500, fontSize: 13, cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>
        {selPos === '기타' && (
          <input value={customPos} onChange={e => setCustomPos(e.target.value)} placeholder="직위 직접 입력" style={{ ...inputSt, marginBottom: 10 }} />
        )}

        <FieldLabel>사무실 전화</FieldLabel>
        <input value={office} onChange={e => setOffice(formatPhone(e.target.value))} placeholder="사무실 전화" style={inputSt} inputMode="tel" />

        <FieldLabel>휴대폰</FieldLabel>
        <input value={mobile} onChange={e => setMobile(formatPhone(e.target.value))} placeholder="휴대폰" style={inputSt} inputMode="tel" />

        {member && onMove && (
          <button onClick={onMove} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: BLUE, fontSize: 14, cursor: 'pointer', padding: '6px 0', marginBottom: 4 }}>
            ⇄ 팀 이동
          </button>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: '#F3F4F6', color: '#6B7280', fontSize: 15, cursor: 'pointer' }}>취소</button>
          <button onClick={save} disabled={!name.trim()} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: name.trim() ? BLUE : '#D1D5DB', color: '#fff', fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'default' }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ── 팀 이동 모달 ──────────────────────────────────────────────────────────────
function MoveModal({ member, targets, onClose, onMove }: {
  member: OrgMember;
  targets: { label: string; deptId: string; teamId: string }[];
  onClose: () => void;
  onMove: (deptId: string, teamId: string) => void;
}) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#F2F2F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 600, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>"{member.name}" 팀 이동</div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {targets.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: GRAY, fontSize: 14 }}>이동 가능한 팀이 없습니다</div>
          ) : targets.map((t, i) => (
            <button key={i} onClick={() => onMove(t.deptId, t.teamId)} style={{ display: 'block', width: '100%', padding: '14px 20px', background: '#fff', border: 'none', borderBottom: '1px solid #F3F4F6', textAlign: 'left', fontSize: 15, color: BLUE, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ margin: '8px 14px 16px', padding: '14px 0', borderRadius: 14, border: 'none', background: '#fff', fontSize: 16, fontWeight: 600, color: BLUE, cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  );
}

// ── 단순 텍스트 입력 모달 ────────────────────────────────────────────────────
function InputModal({ title, placeholder, value, onChange, onClose, onSave }: {
  title: string; placeholder: string; value: string;
  onChange: (s: string) => void; onClose: () => void; onSave: () => void;
}) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', marginBottom: 14 }}>{title}</div>
        <input
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus
          style={inputSt}
          onKeyDown={e => e.key === 'Enter' && onSave()}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: '#F3F4F6', color: '#6B7280', fontSize: 15, cursor: 'pointer' }}>취소</button>
          <button onClick={onSave} disabled={!value.trim()} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: value.trim() ? BLUE : '#D1D5DB', color: '#fff', fontSize: 15, fontWeight: 600, cursor: value.trim() ? 'pointer' : 'default' }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ── 공통 스타일 ───────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid #E5E5EA', background: '#fff',
  fontSize: 15, color: '#1C1C1E', marginBottom: 10,
  boxSizing: 'border-box', outline: 'none',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: GRAY, marginBottom: 4 }}>{children}</div>;
}

function InlineBtn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color, cursor: 'pointer', padding: '2px 6px' }}>
      {children}
    </button>
  );
}
