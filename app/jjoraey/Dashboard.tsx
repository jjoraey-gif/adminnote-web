'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PersonalUser {
  id: string; email: string; nickname: string; provider: string; createdAt: string; grade: string;
}
interface SharedUser {
  id: string; email: string; orgName: string; userId: string; createdAt: string;
}
interface PhotoItem {
  id: string; filePath: string; fileName: string; fileSize: number;
  expiresAt: string; createdAt: string; deletedAt: string | null;
  thumbUrl: string; fullUrl: string;
  uploaderEmail: string; uploaderName: string;
}
interface AppVersionRow {
  platform: string; min_version: string; force_update: boolean; message: string; store_url?: string;
}
interface NoticeRow {
  id: string; title: string; content: string; category: string; is_published: boolean; created_at: string;
}
interface AdminData {
  total: number; personalCount: number; sharedCount: number;
  todayUsers: number; photoCount: number; todayPhotoCount: number;
  personal: PersonalUser[]; shared: SharedUser[]; photos: PhotoItem[];
  usingFallback?: boolean;
  listError?: string | null;
  appVersions?: { ios: AppVersionRow; android: AppVersionRow };
  notices?: NoticeRow[];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' });
}

function ProviderBadge({ provider }: { provider: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    email:  { label: '이메일', bg: '#2563EB', color: '#fff' },
    google: { label: 'Google', bg: '#EA4335', color: '#fff' },
    apple:  { label: 'Apple',  bg: '#1C1C1E', color: '#fff' },
    kakao:  { label: '카카오', bg: '#F7E600', color: '#1C1C1E' },
  };
  const s = map[provider] ?? { label: provider, bg: '#9CA3AF', color: '#fff' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

const PAGE_SIZE = 20;

const GRADE_OPTIONS = [
  { value: 'normal', label: '일반', bg: '#F3F4F6', color: '#6B7280' },
  { value: 'vip',    label: 'VIP',  bg: '#FEF3C7', color: '#D97706' },
  { value: 'vvip',   label: 'VVIP', bg: '#EDE9FE', color: '#7C3AED' },
];

function GradeBadge({ grade }: { grade: string }) {
  const g = GRADE_OPTIONS.find(o => o.value === grade) ?? GRADE_OPTIONS[0];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: g.bg, color: g.color }}>
      {g.label}
    </span>
  );
}

export default function AdminDashboard({ data, sessionToken }: { data: AdminData; sessionToken: string }) {
  const router = useRouter();
  const authHeader = { 'Content-Type': 'application/json', 'X-Admin-Token': sessionToken };
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [personalPage, setPersonalPage] = useState(1);
  const [grades, setGrades] = useState<Record<string, string>>(
    Object.fromEntries(data.personal.map(u => [u.id, u.grade ?? 'normal']))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  // 공지사항 상태
  const [notices, setNotices] = useState<NoticeRow[]>(data.notices ?? []);
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', category: '이용안내', is_published: true });
  const [editingNotice, setEditingNotice] = useState<NoticeRow | null>(null);
  const [savingNotice, setSavingNotice] = useState(false);
  const [noticeFormOpen, setNoticeFormOpen] = useState(false);

  const saveNotice = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) { alert('제목과 내용을 입력해주세요.'); return; }
    setSavingNotice(true);
    try {
      if (editingNotice) {
        const res = await fetch('/api/admin-notice', { method: 'PUT', headers: authHeader, body: JSON.stringify({ id: editingNotice.id, ...noticeForm }) });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '수정 실패'); }
        setNotices(prev => prev.map(n => n.id === editingNotice.id ? { ...n, ...noticeForm } : n));
        setEditingNotice(null);
      } else {
        const res = await fetch('/api/admin-notice', { method: 'POST', headers: authHeader, body: JSON.stringify(noticeForm) });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '등록 실패'); }
        const body = await res.json();
        const created = body.data;
        if (created) {
          setNotices(prev => [created, ...prev]);
        } else {
          // fallback: 서버에서 다시 불러오기
          router.refresh();
        }
      }
      setNoticeForm({ title: '', content: '', category: '이용안내', is_published: true });
      setNoticeFormOpen(false);
    } catch (e: any) {
      alert(`오류: ${e?.message}`);
    } finally {
      setSavingNotice(false);
    }
  };

  const deleteNotice = async (id: string) => {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return;
    await fetch('/api/admin-notice', { method: 'DELETE', headers: authHeader, body: JSON.stringify({ id }) });
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  const startEdit = (n: NoticeRow) => {
    setEditingNotice(n);
    setNoticeForm({ title: n.title, content: n.content, category: n.category, is_published: n.is_published });
    setNoticeFormOpen(true);
  };

  // 버전 관리 상태
  const initVer = (p: 'ios' | 'android') => data.appVersions?.[p] ?? { platform: p, min_version: '1.0.0', force_update: false, message: '' };
  const [iosVer, setIosVer] = useState(initVer('ios'));
  const [andVer, setAndVer] = useState(initVer('android'));
  const [savingVer, setSavingVer] = useState<string | null>(null);
  const [verSaved, setVerSaved] = useState<string | null>(null);

  const saveVersion = async (row: AppVersionRow) => {
    setSavingVer(row.platform);
    const res = await fetch('/api/admin-version', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify(row),
    });
    setSavingVer(null);
    if (res.ok) { setVerSaved(row.platform); setTimeout(() => setVerSaved(null), 2000); }
    else alert('저장 실패');
  };

  const updateGrade = async (userId: string, grade: string) => {
    setSavingId(userId);
    setGrades(prev => ({ ...prev, [userId]: grade }));
    await fetch('/api/admin-grade', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ userId, grade }),
    });
    setSavingId(null);
  };

  const handleLogout = async () => {
    await fetch('/api/admin-login', { method: 'DELETE', headers: authHeader });
    router.refresh();
  };

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16, padding: '24px 28px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #F3F4F6',
  };
  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 12,
    fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #F9FAFB', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* 서비스 롤 키 오류 경고 */}
        {data.listError && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: '12px 20px', marginBottom: 20, fontSize: 13, color: '#92400E' }}>
            ⚠️ <strong>auth.admin.listUsers 실패:</strong> {data.listError}
            <br />
            <span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Vercel 대시보드 → Settings → Environment Variables → <code>SUPABASE_SERVICE_ROLE_KEY</code> 값을 확인하세요.
              {data.usingFallback && ' (현재 profiles 테이블 기반으로 표시 중)'}
            </span>
          </div>
        )}

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
              <span style={{ color: '#2563EB' }}>Admin</span>
              <span style={{ color: '#1C1C1E' }}>Note</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#9CA3AF', marginLeft: 12 }}>관리자</span>
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <button onClick={handleLogout} style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 500,
            border: '1px solid #E5E7EB', borderRadius: 20,
            background: '#fff', color: '#6B7280', cursor: 'pointer',
          }}>로그아웃</button>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: '총 회원수',      value: data.total,            color: '#2563EB' },
            { label: '개인회원',       value: data.personalCount,    color: '#16A34A' },
            { label: '공용폰',         value: data.sharedCount,      color: '#9333EA' },
            { label: '오늘 가입',      value: data.todayUsers,       color: '#F59E0B' },
            { label: '파일전송 건수',  value: data.photoCount,       color: '#EF4444' },
            { label: '오늘 파일전송',  value: data.todayPhotoCount,  color: '#0891B2' },
          ].map(({ label, value, color }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 개인회원 */}
        {(() => {
          const totalPages = Math.ceil(data.personal.length / PAGE_SIZE);
          const paged = data.personal.slice((personalPage - 1) * PAGE_SIZE, personalPage * PAGE_SIZE);
          return (
            <div style={{ ...card, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
                개인회원 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.personalCount}명</span>
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#F9FAFB' }}>
                    <th style={th}>#</th><th style={th}>이메일</th><th style={th}>닉네임</th>
                    <th style={th}>로그인 방식</th><th style={th}>가입일</th><th style={th}>등급</th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0
                      ? <tr><td colSpan={6} style={{ ...td, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>없음</td></tr>
                      : paged.map((u, i) => {
                          const globalIdx = (personalPage - 1) * PAGE_SIZE + i + 1;
                          const currentGrade = grades[u.id] ?? 'normal';
                          return (
                            <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                              <td style={{ ...td, color: '#9CA3AF' }}>{globalIdx}</td>
                              <td style={td}>{u.email}</td>
                              <td style={td}>{u.nickname}</td>
                              <td style={td}><ProviderBadge provider={u.provider} /></td>
                              <td style={{ ...td, color: '#9CA3AF' }}>{fmt(u.createdAt)}</td>
                              <td style={td}>
                                <select
                                  value={currentGrade}
                                  disabled={savingId === u.id}
                                  onChange={e => updateGrade(u.id, e.target.value)}
                                  style={{
                                    fontSize: 12, fontWeight: 600, padding: '3px 6px',
                                    borderRadius: 6, border: '1px solid #E5E7EB',
                                    background: GRADE_OPTIONS.find(o => o.value === currentGrade)?.bg ?? '#F3F4F6',
                                    color: GRADE_OPTIONS.find(o => o.value === currentGrade)?.color ?? '#6B7280',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {GRADE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 16 }}>
                  <button
                    onClick={() => setPersonalPage(p => Math.max(1, p - 1))}
                    disabled={personalPage === 1}
                    style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: personalPage === 1 ? 'default' : 'pointer', opacity: personalPage === 1 ? 0.4 : 1 }}
                  >‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setPersonalPage(page)}
                      style={{
                        padding: '5px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                        border: page === personalPage ? '1px solid #2563EB' : '1px solid #E5E7EB',
                        background: page === personalPage ? '#2563EB' : '#fff',
                        color: page === personalPage ? '#fff' : '#374151',
                        fontWeight: page === personalPage ? 700 : 400,
                      }}
                    >{page}</button>
                  ))}
                  <button
                    onClick={() => setPersonalPage(p => Math.min(totalPages, p + 1))}
                    disabled={personalPage === totalPages}
                    style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: personalPage === totalPages ? 'default' : 'pointer', opacity: personalPage === totalPages ? 0.4 : 1 }}
                  >›</button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 사진 갤러리 */}
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            전송된 파일 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.photoCount}건</span>
          </h2>
          {data.photos.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0', margin: 0 }}>파일 없음</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {data.photos.map(p => {
                const isDeleted = !!p.deletedAt;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isDeleted && p.fullUrl && setSelectedPhoto(p)}
                    style={{
                      borderRadius: 10, overflow: 'hidden',
                      border: `1px solid ${isDeleted ? '#FCA5A5' : '#F3F4F6'}`,
                      position: 'relative',
                      cursor: isDeleted ? 'default' : 'pointer',
                      opacity: isDeleted ? 0.7 : 1,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { if (!isDeleted) { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                  >
                    {/* 이미지 or 파일 아이콘 */}
                    {p.thumbUrl ? (
                      <img src={p.thumbUrl} alt={p.fileName}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', filter: isDeleted ? 'grayscale(60%)' : 'none' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '1', background: isDeleted ? '#FEE2E2' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 32 }}>📄</span>
                      </div>
                    )}

                    {/* 삭제됨 배지 */}
                    {isDeleted && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: '#EF4444', color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 99,
                      }}>
                        삭제됨
                      </div>
                    )}

                    <div style={{ padding: '6px 8px', background: isDeleted ? '#FFF5F5' : '#fff' }}>
                      <div style={{ fontSize: 11, color: isDeleted ? '#9CA3AF' : '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.fileName}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                        {p.uploaderName !== '-' ? p.uploaderName : p.uploaderEmail.split('@')[0]}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {fmt(p.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 사진 전체보기 모달 */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.82)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img
                src={selectedPhoto.fullUrl}
                alt={selectedPhoto.fileName}
                style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: -48, left: 0, right: 0,
                textAlign: 'center', color: '#fff', fontSize: 13,
              }}>
                <span style={{ fontWeight: 600 }}>{selectedPhoto.fileName}</span>
                <span style={{ color: '#9CA3AF', marginLeft: 12 }}>
                  {selectedPhoto.uploaderName !== '-' ? selectedPhoto.uploaderName : selectedPhoto.uploaderEmail.split('@')[0]}
                </span>
                <span style={{ color: '#6B7280', marginLeft: 8 }}>{fmt(selectedPhoto.createdAt)}</span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{
                  position: 'absolute', top: -16, right: -16,
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 16, fontWeight: 700, color: '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >✕</button>
            </div>
          </div>
        )}

        {/* 공지사항 관리 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>공지사항 관리</h2>
            <button
              onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', content: '', category: '이용안내', is_published: true }); setNoticeFormOpen(v => !v); }}
              style={{ padding: '7px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {noticeFormOpen && !editingNotice ? '취소' : '+ 새 공지'}
            </button>
          </div>

          {/* 작성/수정 폼 */}
          {noticeFormOpen && (
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <select
                  value={noticeForm.category}
                  onChange={e => setNoticeForm(f => ({ ...f, category: e.target.value }))}
                  style={{ padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}
                >
                  <option value="이용안내">이용안내</option>
                  <option value="업데이트">업데이트</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={noticeForm.is_published} onChange={e => setNoticeForm(f => ({ ...f, is_published: e.target.checked }))} />
                  게시 중
                </label>
              </div>
              <input
                type="text"
                placeholder="제목"
                value={noticeForm.title}
                onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="내용"
                value={noticeForm.content}
                onChange={e => setNoticeForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <button
                onClick={saveNotice}
                disabled={savingNotice}
                style={{ padding: '9px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: savingNotice ? 0.6 : 1 }}
              >
                {savingNotice ? '저장 중...' : editingNotice ? '수정 완료' : '등록'}
              </button>
            </div>
          )}

          {/* 공지 목록 */}
          {notices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 14 }}>등록된 공지사항이 없습니다</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notices.map(n => (
                <div key={n.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', background: n.is_published ? '#fff' : '#F9FAFB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                        background: n.category === '업데이트' ? '#EFF6FF' : '#F0FDF4',
                        color: n.category === '업데이트' ? '#2563EB' : '#16A34A',
                      }}>{n.category}</span>
                      {!n.is_published && <span style={{ fontSize: 11, color: '#9CA3AF', border: '1px solid #E5E7EB', borderRadius: 99, padding: '1px 7px' }}>비공개</span>}
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(n)} style={{ padding: '5px 12px', fontSize: 12, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 7, cursor: 'pointer' }}>수정</button>
                      <button onClick={() => deleteNotice(n.id)} style={{ padding: '5px 12px', fontSize: 12, background: '#fff', border: '1px solid #FEE2E2', color: '#EF4444', borderRadius: 7, cursor: 'pointer' }}>삭제</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{n.content}</div>
                  <div style={{ fontSize: 11, color: '#D1D5DB', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 앱 버전 관리 */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>앱 버전 관리</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {([['ios', iosVer, setIosVer], ['android', andVer, setAndVer]] as const).map(([platform, ver, setVer]) => (
              <div key={platform} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>{platform === 'ios' ? '🍎' : '🤖'}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{platform === 'ios' ? 'iOS' : 'Android'}</span>
                </div>

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>최소 버전 (이하 강제 업데이트)</label>
                <input
                  type="text"
                  value={ver.min_version}
                  onChange={e => setVer((v: AppVersionRow) => ({ ...v, min_version: e.target.value }))}
                  placeholder="예: 2.15.0"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
                />

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>업데이트 안내 메시지</label>
                <textarea
                  value={ver.message}
                  onChange={e => setVer((v: AppVersionRow) => ({ ...v, message: e.target.value }))}
                  rows={2}
                  placeholder="새 버전이 출시되었습니다."
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ver.force_update}
                    onChange={e => setVer((v: AppVersionRow) => ({ ...v, force_update: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: '#374151' }}>강제 업데이트 (닫기 불가)</span>
                </label>

                <button
                  onClick={() => saveVersion(ver)}
                  disabled={savingVer === platform}
                  style={{
                    width: '100%', padding: '9px 0', background: verSaved === platform ? '#10B981' : '#2563EB',
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: savingVer === platform ? 'default' : 'pointer', opacity: savingVer === platform ? 0.7 : 1,
                    transition: 'background 0.3s',
                  }}
                >
                  {savingVer === platform ? '저장 중...' : verSaved === platform ? '✓ 저장됨' : '저장'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 공용폰 */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            공용폰 회원 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.sharedCount}명</span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#F9FAFB' }}>
                <th style={th}>#</th><th style={th}>기관명</th><th style={th}>아이디</th>
                <th style={th}>이메일</th><th style={th}>가입일</th>
              </tr></thead>
              <tbody>
                {data.shared.length === 0
                  ? <tr><td colSpan={5} style={{ ...td, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>없음</td></tr>
                  : data.shared.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ ...td, color: '#9CA3AF' }}>{i + 1}</td>
                      <td style={td}>{u.orgName}</td>
                      <td style={td}>{u.userId}</td>
                      <td style={td}>{u.email}</td>
                      <td style={{ ...td, color: '#9CA3AF' }}>{fmt(u.createdAt)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
