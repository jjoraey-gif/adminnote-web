'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PersonalUser {
  id: string; email: string; nickname: string; provider: string; createdAt: string;
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
interface AdminData {
  total: number; personalCount: number; sharedCount: number;
  todayUsers: number; photoCount: number;
  personal: PersonalUser[]; shared: SharedUser[]; photos: PhotoItem[];
  usingFallback?: boolean;
  listError?: string | null;
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

export default function AdminDashboard({ data }: { data: AdminData }) {
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const handleLogout = async () => {
    await fetch('/api/admin-login', { method: 'DELETE' });
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: '총 회원수',     value: data.total,         color: '#2563EB' },
            { label: '개인회원',      value: data.personalCount, color: '#16A34A' },
            { label: '공용폰',        value: data.sharedCount,   color: '#9333EA' },
            { label: '오늘 가입',     value: data.todayUsers,    color: '#F59E0B' },
            { label: '사진전송 건수', value: data.photoCount,    color: '#EF4444' },
          ].map(({ label, value, color }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 개인회원 */}
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            개인회원 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.personalCount}명</span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#F9FAFB' }}>
                <th style={th}>#</th><th style={th}>이메일</th><th style={th}>닉네임</th>
                <th style={th}>로그인 방식</th><th style={th}>가입일</th>
              </tr></thead>
              <tbody>
                {data.personal.length === 0
                  ? <tr><td colSpan={5} style={{ ...td, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>없음</td></tr>
                  : data.personal.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ ...td, color: '#9CA3AF' }}>{i + 1}</td>
                      <td style={td}>{u.email}</td>
                      <td style={td}>{u.nickname}</td>
                      <td style={td}><ProviderBadge provider={u.provider} /></td>
                      <td style={{ ...td, color: '#9CA3AF' }}>{fmt(u.createdAt)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

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
