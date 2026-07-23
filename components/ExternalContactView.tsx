'use client';

import { useState } from 'react';
import { ExternalContact, ContactGroup } from '@/lib/useWebStore';

interface Props {
  contacts: ExternalContact[];
  groups: ContactGroup[];
}

export default function ExternalContactView({ contacts, groups }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? contacts.filter(c =>
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.personName.toLowerCase().includes(search.toLowerCase()) ||
        c.relatedWork.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : contacts;

  const forGroup = (gid: string | null) =>
    filtered.filter(c => (c.groupId ?? null) === gid);

  const ungrouped = forGroup(null);

  if (contacts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ fontSize: 48 }}>📋</div>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#374151', margin: 0 }}>외부연락처가 없습니다</p>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>앱에서 연락처를 추가하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div>
      {/* 검색 */}
      <div style={{ marginBottom: 24 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름, 회사명, 업무 검색..."
          style={{
            width: '100%', padding: '10px 16px', fontSize: 14,
            border: '1px solid #E5E7EB', borderRadius: 10,
            outline: 'none', boxSizing: 'border-box',
            background: '#F9FAFB',
          }}
        />
      </div>

      {/* 미분류 */}
      {ungrouped.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
            미분류
          </h3>
          <ContactList contacts={ungrouped} />
        </div>
      )}

      {/* 그룹별 */}
      {groups.map(g => {
        const gc = forGroup(g.id);
        if (gc.length === 0) return null;
        return (
          <div key={g.id} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
              {g.name}
            </h3>
            <ContactList contacts={gc} />
          </div>
        );
      })}

      {filtered.length === 0 && search && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}

function ContactList({ contacts }: { contacts: ExternalContact[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {contacts.map(c => <ContactCard key={c.id} contact={c} />)}
    </div>
  );
}

function ContactCard({ contact: c }: { contact: ExternalContact }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #F3F4F6', borderRadius: 12,
      padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* 아바타 */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#4F46E5', flexShrink: 0,
        }}>
          {c.personName ? c.personName[0] : c.companyName[0] ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
            {c.personName || '(이름 없음)'}
            {c.position && <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 400, marginLeft: 6 }}>{c.position}</span>}
          </div>
          {c.companyName && (
            <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 2 }}>{c.companyName}</div>
          )}
          {c.department && (
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{c.department}</div>
          )}
        </div>
      </div>

      {/* 연락처 정보 */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {c.phone && (
          <a href={`tel:${c.phone}`} style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📞</span> {c.phone}
          </a>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✉️</span> {c.email}
          </a>
        )}
        {c.relatedWork && (
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, padding: '4px 8px', background: '#F9FAFB', borderRadius: 6 }}>
            {c.relatedWork}
          </div>
        )}
      </div>
    </div>
  );
}
