'use client';

import { useState, useMemo } from 'react';
import { ExternalContact, ContactGroup } from '@/lib/useWebStore';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const ROW_COLORS = [
  { bar: '#185FA5', avatarBg: '#E6F1FB', avatarFg: '#185FA5' },
  { bar: '#059669', avatarBg: '#EAF3DE', avatarFg: '#3B6D11' },
  { bar: '#7C3AED', avatarBg: '#EEEDFE', avatarFg: '#3C3489' },
  { bar: '#DC2626', avatarBg: '#FCEBEB', avatarFg: '#A32D2D' },
  { bar: '#D97706', avatarBg: '#FFF3CD', avatarFg: '#854F0B' },
  { bar: '#0891B2', avatarBg: '#E1F5EE', avatarFg: '#0F6E56' },
  { bar: '#B45309', avatarBg: '#FEF3C7', avatarFg: '#B45309' },
];
function rowColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ROW_COLORS[h % ROW_COLORS.length];
}

interface Props {
  contacts: ExternalContact[];
  groups: ContactGroup[];
  onAdd: (c: ExternalContact) => void;
  onUpdate: (c: ExternalContact) => void;
  onDelete: (id: string) => void;
  onAddGroup: (g: ContactGroup) => void;
  onDeleteGroup: (id: string) => void;
}

export default function ExternalContactView({ contacts, groups, onAdd, onUpdate, onDelete, onAddGroup, onDeleteGroup }: Props) {
  const [search, setSearch] = useState('');
  const [editingContact, setEditingContact] = useState<ExternalContact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [menuContact, setMenuContact] = useState<ExternalContact | null>(null);
  const [menuGroup, setMenuGroup] = useState<ContactGroup | null>(null);
  const [movingContact, setMovingContact] = useState<ExternalContact | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const t = search.toLowerCase();
    return contacts.filter(c =>
      c.companyName.toLowerCase().includes(t) ||
      c.personName.toLowerCase().includes(t) ||
      c.relatedWork.toLowerCase().includes(t) ||
      c.phone.includes(t)
    );
  }, [contacts, search]);

  const forGroup = (gid: string | null) => filtered.filter(c => (c.groupId ?? null) === gid);
  const ungrouped = forGroup(null);

  return (
    <div style={{ position: 'relative' }}>
      {/* 상단 툴바 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="업체명, 이름, 관련업무 검색..."
          style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #E5E7EB', borderRadius: 10, outline: 'none', background: '#F9FAFB' }}
        />
        <button
          onClick={() => setShowAddGroup(true)}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151' }}
        >
          + 그룹
        </button>
        <button
          onClick={() => setShowAddContact(true)}
          style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 10, background: '#2563EB', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          + 연락처
        </button>
      </div>

      {contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>외부연락처가 없습니다</p>
          <p style={{ fontSize: 13, margin: 0 }}>오른쪽 상단의 + 연락처 버튼으로 추가하세요.</p>
        </div>
      ) : (
        <>
          {/* 미분류 */}
          {ungrouped.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 10, letterSpacing: 1 }}>미분류</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ungrouped.map(c => (
                  <ContactRow key={c.id} c={c} onMenu={() => setMenuContact(c)} />
                ))}
              </div>
            </div>
          )}

          {/* 그룹별 */}
          {groups.map(g => {
            const gc = forGroup(g.id);
            return (
              <div key={g.id} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📁</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>({gc.length})</span>
                  </div>
                  <button
                    onClick={() => setMenuGroup(g)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, padding: '0 4px' }}
                  >⋯</button>
                </div>
                {gc.length === 0
                  ? <div style={{ fontSize: 13, color: '#C7C7CC', paddingLeft: 4 }}>비어 있음</div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {gc.map(c => <ContactRow key={c.id} c={c} onMenu={() => setMenuContact(c)} />)}
                    </div>
                }
              </div>
            );
          })}

          {filtered.length === 0 && search && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>검색 결과가 없습니다.</div>
          )}
        </>
      )}

      {/* 연락처 추가/수정 모달 */}
      {(showAddContact || editingContact) && (
        <ContactModal
          contact={editingContact ?? undefined}
          groups={groups}
          onClose={() => { setShowAddContact(false); setEditingContact(null); }}
          onSave={c => {
            editingContact ? onUpdate(c) : onAdd(c);
            setShowAddContact(false);
            setEditingContact(null);
          }}
        />
      )}

      {/* 그룹 추가 모달 */}
      {showAddGroup && (
        <Overlay onClose={() => { setShowAddGroup(false); setGroupName(''); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 340, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>그룹 추가</h3>
            <input
              autoFocus
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && groupName.trim()) { onAddGroup({ id: uuid(), name: groupName.trim() }); setGroupName(''); setShowAddGroup(false); } }}
              placeholder="그룹 이름"
              style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #E5E7EB', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button onClick={() => { setShowAddGroup(false); setGroupName(''); }} style={{ border: 'none', background: 'none', fontSize: 15, color: '#6B7280', cursor: 'pointer' }}>취소</button>
              <button
                onClick={() => { if (groupName.trim()) { onAddGroup({ id: uuid(), name: groupName.trim() }); setGroupName(''); setShowAddGroup(false); } }}
                disabled={!groupName.trim()}
                style={{ border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 15, fontWeight: 600, background: groupName.trim() ? '#2563EB' : '#D1D5DB', color: '#fff', cursor: groupName.trim() ? 'pointer' : 'default' }}
              >추가</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* 연락처 액션 메뉴 */}
      {menuContact && (
        <Overlay onClose={() => setMenuContact(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 8, width: 240, maxWidth: '90vw' }}>
            <div style={{ padding: '10px 16px', fontSize: 13, color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>
              {menuContact.companyName} {menuContact.personName}
            </div>
            <MenuBtn label="수정" onClick={() => { setEditingContact(menuContact); setMenuContact(null); }} />
            <MenuBtn label="그룹 이동" onClick={() => { setMovingContact(menuContact); setMenuContact(null); }} />
            <MenuBtn label="삭제" danger onClick={() => { onDelete(menuContact.id); setMenuContact(null); }} />
          </div>
        </Overlay>
      )}

      {/* 그룹 삭제 메뉴 */}
      {menuGroup && (
        <Overlay onClose={() => setMenuGroup(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 8, width: 280, maxWidth: '90vw' }}>
            <div style={{ padding: '10px 16px', fontSize: 13, color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>{menuGroup.name}</div>
            <MenuBtn label="그룹 삭제 (연락처는 미분류로 이동)" danger onClick={() => { onDeleteGroup(menuGroup.id); setMenuGroup(null); }} />
            <MenuBtn label="취소" onClick={() => setMenuGroup(null)} />
          </div>
        </Overlay>
      )}

      {/* 그룹 이동 */}
      {movingContact && (
        <Overlay onClose={() => setMovingContact(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 8, width: 260, maxWidth: '90vw' }}>
            <div style={{ padding: '10px 16px', fontSize: 13, color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>그룹 이동</div>
            <MenuBtn label="미분류" onClick={() => { onUpdate({ ...movingContact, groupId: null }); setMovingContact(null); }} />
            {groups.map(g => (
              <MenuBtn key={g.id} label={g.name} onClick={() => { onUpdate({ ...movingContact, groupId: g.id }); setMovingContact(null); }} />
            ))}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function ContactRow({ c, onMenu }: { c: ExternalContact; onMenu: () => void }) {
  const col = rowColor(c.id);
  const initial = c.personName?.[0] ?? c.companyName?.[0] ?? '?';
  return (
    <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff' }}>
      <div style={{ width: 4, background: col.bar, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: col.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: col.avatarFg, flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{c.personName || c.companyName}</span>
            {c.personName && c.companyName && <span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.companyName}</span>}
          </div>
          {(c.department || c.position) && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{[c.department, c.position].filter(Boolean).join(' · ')}</div>
          )}
          {c.relatedWork && <div style={{ fontSize: 12, color: '#7C3AED', marginTop: 2 }}>{c.relatedWork}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {c.phone && (
            <a href={`tel:${c.phone.replace(/-/g, '')}`} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 16 }}>
              📞
            </a>
          )}
          <button onClick={onMenu} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⋯
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ contact, groups, onClose, onSave }: {
  contact?: ExternalContact;
  groups: ContactGroup[];
  onClose: () => void;
  onSave: (c: ExternalContact) => void;
}) {
  const [company, setCompany] = useState(contact?.companyName ?? '');
  const [person, setPerson] = useState(contact?.personName ?? '');
  const [dept, setDept] = useState(contact?.department ?? '');
  const [position, setPosition] = useState(contact?.position ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [work, setWork] = useState(contact?.relatedWork ?? '');
  const [groupId, setGroupId] = useState<string | null>(contact?.groupId ?? null);

  const handleSave = () => {
    if (!company.trim()) return;
    onSave({
      id: contact?.id ?? uuid(),
      companyName: company.trim(),
      personName: person.trim(),
      department: dept.trim(),
      position: position.trim(),
      phone: phone.trim(),
      email: email.trim(),
      relatedWork: work.trim(),
      groupId,
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: '#F9FAFB', borderRadius: 20, width: 480, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{contact ? '연락처 수정' : '연락처 추가'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="업체명 *" value={company} onChange={setCompany} />
          <Field label="이름" value={person} onChange={setPerson} />
          <Field label="부서" value={dept} onChange={setDept} />
          <Field label="직위" value={position} onChange={setPosition} />
          <Field label="전화" value={phone} onChange={setPhone} type="tel" />
          <Field label="이메일" value={email} onChange={setEmail} type="email" />
          <Field label="관련업무" value={work} onChange={setWork} />
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>그룹</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="미분류" active={groupId === null} onPress={() => setGroupId(null)} />
              {groups.map(g => <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} />)}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', background: '#fff' }}>
          <button
            onClick={handleSave}
            disabled={!company.trim()}
            style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 600, border: 'none', borderRadius: 12, background: company.trim() ? '#2563EB' : '#D1D5DB', color: '#fff', cursor: company.trim() ? 'pointer' : 'default' }}
          >저장</button>
        </div>
      </div>
    </Overlay>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #E5E7EB', borderRadius: 10, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${active ? '#7C3AED' : '#E5E7EB'}`, background: active ? '#7C3AED' : '#fff', color: active ? '#fff' : '#374151', fontSize: 13, cursor: 'pointer', fontWeight: active ? 600 : 400 }}
    >{label}</button>
  );
}

function MenuBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', padding: '13px 16px', textAlign: 'left', border: 'none', background: 'none', fontSize: 15, color: danger ? '#EF4444' : '#111827', cursor: 'pointer', borderTop: '1px solid #F3F4F6' }}
    >{label}</button>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
