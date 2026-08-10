'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PersonalUser {
  id: string; email: string; nickname: string; provider: string; createdAt: string; grade: string; no?: number;
}
interface SharedUser {
  id: string; email: string; orgName: string; userId: string; createdAt: string;
}
interface PhotoItem {
  id: string; filePath: string; fileName: string; fileSize: number;
  expiresAt: string; createdAt: string; deletedAt: string | null; isNew: boolean;
  thumbUrl: string; fullUrl: string;
  uploaderEmail: string; uploaderName: string;
}
interface AppVersionRow {
  platform: string; min_version: string; force_update: boolean; message: string; store_url?: string;
}
interface NoticeRow {
  id: string; title: string; content: string; category: string; is_published: boolean; created_at: string;
}
interface SuggestionRow {
  id: string; user_email: string; user_nickname: string; content: string; is_read: boolean; created_at: string;
}
interface AdminData {
  total: number; personalCount: number; sharedCount: number;
  todayUsers: number; photoCount: number; todayPhotoCount: number;
  totalVisits?: number; todayVisits?: number;
  personal: PersonalUser[]; shared: SharedUser[]; photos: PhotoItem[];
  usingFallback?: boolean;
  listError?: string | null;
  appVersions?: { ios: AppVersionRow; android: AppVersionRow };
  notices?: NoticeRow[];
  suggestions?: SuggestionRow[];
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

// 관리자 페이지에서 한 번에 불러올 전송 파일 최대 건수 (서버에서도 60으로 상한 적용)
const PHOTO_FETCH_LIMIT = 60;

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

// ── 회원 데이터 모달 ──────────────────────────────────────────────────────────
function UserDataModal({ user, onClose }: { user: PersonalUser; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<Record<string, any> | null>(null);
  const [tab, setTab] = useState<'history' | 'promotion'>('history');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-user-data?userId=${user.id}`);
      const body = await res.json();
      setSnap(body.data ?? null);
    } catch { setSnap(null); }
    setLoading(false);
  };

  useState(() => { fetchData(); });

  const promotions = snap?.promotions ?? [];
  const assignments = snap?.assignments ?? [];
  const awards = snap?.awards ?? [];
  const careerInfo = snap?.careerInfo ?? null;
  const perfRatings = snap?.performanceRatings ?? [];
  const pastPerf = snap?.pastPerformanceRatings ?? [];
  const sameGrade = snap?.sameGradePromotions ?? [];

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';

  const TABS = [
    { key: 'history', label: '이력관리' },
    { key: 'promotion', label: '승진순위관리' },
  ] as const;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#F9FAFB', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{user.nickname || user.email}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '12px 0', fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#2563EB' : '#6B7280',
              border: 'none', background: 'none',
              borderBottom: tab === t.key ? '2px solid #2563EB' : '2px solid transparent',
              cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {/* 내용 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, color: '#9CA3AF', fontSize: 14 }}>불러오는 중...</div>
          ) : snap === null ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <div>저장된 데이터가 없습니다</div>
            </div>
          ) : tab === 'history' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 공직정보 */}
              {careerInfo && (
                <Section title="공직정보">
                  <InfoGrid items={[
                    { label: '입직일', value: fmtDate(careerInfo.startDate) },
                    { label: '초임직급', value: careerInfo.initialGrade || '-' },
                    { label: '현재 호봉', value: careerInfo.stepGrade ? `${careerInfo.stepGrade}호봉` : '-' },
                    { label: '다음 호봉 승급일', value: fmtDate(careerInfo.nextStepUpDate) },
                  ]} />
                </Section>
              )}
              {/* 승진이력 */}
              <Section title={`승진이력 (${promotions.length}건)`}>
                {promotions.length === 0 ? <Empty /> : (
                  <SimpleTable
                    headers={['직급', '날짜', '비고']}
                    rows={promotions.map((p: any) => [p.grade, fmtDate(p.date), p.note || '-'])}
                  />
                )}
              </Section>
              {/* 발령이력 */}
              <Section title={`발령이력 (${assignments.length}건)`}>
                {assignments.length === 0 ? <Empty /> : (
                  <SimpleTable
                    headers={['부서', '날짜']}
                    rows={assignments.map((a: any) => [a.department, fmtDate(a.date)])}
                  />
                )}
              </Section>
              {/* 포상이력 */}
              <Section title={`포상이력 (${awards.length}건)`}>
                {awards.length === 0 ? <Empty /> : (
                  <SimpleTable
                    headers={['포상명', '등급', '날짜']}
                    rows={awards.map((a: any) => [a.name, a.grade || '-', fmtDate(a.date)])}
                  />
                )}
              </Section>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 최근 근평 순위 */}
              <Section title={`최근 근평 순위 (${perfRatings.length}건)`}>
                {perfRatings.length === 0 ? <Empty /> : (
                  <SimpleTable
                    headers={['날짜', '순위']}
                    rows={perfRatings.map((r: any) => [fmtDate(r.date), `${r.rank}위`])}
                  />
                )}
              </Section>
              {/* 과거 근평 이력 */}
              <Section title={`과거 근평 이력 (${pastPerf.length}건)`}>
                {pastPerf.length === 0 ? <Empty /> : (
                  <SimpleTable
                    headers={['날짜', '순위']}
                    rows={pastPerf.map((r: any) => [fmtDate(r.date), `${r.rank}위`])}
                  />
                )}
              </Section>
              {/* 동직급 승진자 수 */}
              <Section title={`동직급 승진자 수 (${sameGrade.length}건)`}>
                {sameGrade.length === 0 ? <Empty /> : (
                  <SimpleTable
                    headers={['날짜', '인원']}
                    rows={sameGrade.map((s: any) => [fmtDate(s.date), `${s.count}명`])}
                  />
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      <div style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#374151', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>{title}</div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {items.map(it => (
        <div key={it.label}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{it.label}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E' }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#F9FAFB' }}>
          {headers.map(h => <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#6B7280', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #F3F4F6' }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
            {row.map((cell, j) => <td key={j} style={{ padding: '8px 10px', color: '#374151' }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty() {
  return <div style={{ fontSize: 13, color: '#C7C7CC', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>;
}

// ── 전체 이력 현황 섹션 ────────────────────────────────────────────────────────
interface HistoryRow {
  userId: string; email: string; nickname: string;
  currentDept: string; currentGrade: string; startDate: string | null;
  promotionCount: number; assignmentCount: number; awardCount: number;
  currentRank: number | null; currentRankDate: string | null;
  assignments: { department: string; date: string }[];
  promotions: { grade: string; date: string; note: string }[];
}

function AllHistoriesSection({ card }: { card: React.CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPromoId, setExpandedPromoId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-all-histories');
      const body = await res.json();
      setRows(body.rows ?? []);
      setLoaded(true);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';

  const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6', whiteSpace: 'nowrap', background: '#F9FAFB' };
  const td: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F9FAFB', whiteSpace: 'nowrap' };

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: loaded ? 20 : 0 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            전체 이력 현황
            {loaded && <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400, marginLeft: 8 }}>{rows.length}명</span>}
          </h2>
          {!loaded && <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>회원별 현재 부서·직급·이력 요약</p>}
        </div>
        {!loaded ? (
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >{loading ? '불러오는 중...' : '불러오기'}</button>
        ) : (
          <button onClick={load} style={{ padding: '6px 14px', fontSize: 12, color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>새로고침</button>
        )}
      </div>

      {loaded && (
        rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>이력 데이터가 없습니다</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>닉네임</th>
                  <th style={th}>이메일</th>
                  <th style={{ ...th, maxWidth: 90, width: 90 }}>현재 부서</th>
                  <th style={{ ...th, paddingRight: 6 }}>현재 직급</th>
                  <th style={{ ...th, paddingLeft: 6 }}>순위</th>
                  <th style={th}>입직일</th>
                  <th style={th}>승진</th>
                  <th style={th}>발령</th>
                  <th style={th}>포상</th>
                  <th style={th}>승진 내역</th>
                  <th style={th}>발령 내역</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <>
                    <tr key={r.userId} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ ...td, color: '#9CA3AF' }}>{i + 1}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.nickname !== '-' ? r.nickname : '-'}</td>
                      <td style={{ ...td, color: '#6B7280' }}>{r.email}</td>
                      <td style={{ ...td, maxWidth: 90, width: 90, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span
                          title={r.currentDept}
                          style={{
                            display: 'inline-block',
                            background: r.currentDept !== '-' ? '#EFF6FF' : '#F9FAFB', color: r.currentDept !== '-' ? '#2563EB' : '#9CA3AF',
                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                          }}
                        >
                          {r.currentDept !== '-' && r.currentDept.length > 6 ? `${r.currentDept.slice(0, 6)}…` : r.currentDept}
                        </span>
                      </td>
                      <td style={{ ...td, paddingRight: 6 }}>{r.currentGrade !== '-' ? <span style={{ background: '#F0FDF4', color: '#16A34A', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>{r.currentGrade}</span> : '-'}</td>
                      <td style={{ ...td, paddingLeft: 6 }}>
                        {r.currentRank != null ? (
                          <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                            {r.currentRank}위
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ ...td, color: '#9CA3AF' }}>{fmtDate(r.startDate)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.promotionCount > 0 ? <span style={{ fontWeight: 600, color: '#7C3AED' }}>{r.promotionCount}</span> : <span style={{ color: '#D1D5DB' }}>0</span>}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.assignmentCount > 0 ? <span style={{ fontWeight: 600, color: '#0891B2' }}>{r.assignmentCount}</span> : <span style={{ color: '#D1D5DB' }}>0</span>}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.awardCount > 0 ? <span style={{ fontWeight: 600, color: '#D97706' }}>{r.awardCount}</span> : <span style={{ color: '#D1D5DB' }}>0</span>}</td>
                      <td style={td}>
                        {r.promotions.length > 0 && (
                          <button
                            onClick={() => setExpandedPromoId(expandedPromoId === r.userId ? null : r.userId)}
                            style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                          >{expandedPromoId === r.userId ? '접기 ▲' : '보기 ▼'}</button>
                        )}
                      </td>
                      <td style={td}>
                        {r.assignments.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === r.userId ? null : r.userId)}
                            style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                          >{expandedId === r.userId ? '접기 ▲' : '보기 ▼'}</button>
                        )}
                      </td>
                    </tr>
                    {expandedPromoId === r.userId && r.promotions.length > 0 && (
                      <tr key={`${r.userId}-promo-expand`} style={{ background: '#FAF5FF' }}>
                        <td colSpan={12} style={{ padding: '10px 20px 14px 60px' }}>
                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 600 }}>승진 이력 (최신순)</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {r.promotions.map((p, pi) => (
                              <span key={pi} style={{ background: '#fff', border: '1px solid #DDD6FE', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#7C3AED' }}>
                                {p.grade || p.note || '승진'} <span style={{ color: '#C4B5FD', marginLeft: 4 }}>{fmtDate(p.date)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedId === r.userId && r.assignments.length > 0 && (
                      <tr key={`${r.userId}-expand`} style={{ background: '#F0F9FF' }}>
                        <td colSpan={12} style={{ padding: '10px 20px 14px 60px' }}>
                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 600 }}>발령 이력 (최신순)</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {r.assignments.map((a, ai) => (
                              <span key={ai} style={{ background: '#fff', border: '1px solid #BFDBFE', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#1D4ED8' }}>
                                {a.department} <span style={{ color: '#93C5FD', marginLeft: 4 }}>{fmtDate(a.date)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

export default function AdminDashboard({ data }: { data: AdminData }) {
  const router = useRouter();
  // 인증은 httpOnly 쿠키(path: '/')로 자동 전송됨 — 토큰을 클라이언트에 두지 않는다
  const authHeader = { 'Content-Type': 'application/json' };
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<PersonalUser | null>(null);
  const [personalPage, setPersonalPage] = useState(1);
  const [photoPage, setPhotoPage] = useState(1);
  const PHOTO_PAGE_SIZE = 20; // 이미지 전송량을 줄이기 위해 한 페이지 표시 수를 축소

  // ── 전송된 파일 — 요청할 때만 불러온다 (Egress 절감) ──
  // 예전에는 페이지를 열 때마다 서버가 200건의 signed URL을 만들고 브라우저가
  // 원본 이미지를 즉시 전부 내려받아 대역폭을 크게 소모했다.
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  // 이번에 서버에서 불러온 전체 목록(이미 확인한 것 포함) — "전체보기" 토글용으로 별도 보관
  const [allLoadedPhotos, setAllLoadedPhotos] = useState<PhotoItem[]>([]);
  // 이번 조회에서 "처음 보는" 것으로 판정된 사진 id — 기본으로는 이것만 화면에 표시
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());
  const [showSeenPhotos, setShowSeenPhotos] = useState(false);

  const loadPhotos = async () => {
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/admin-photos?limit=${PHOTO_FETCH_LIMIT}`);
      const body = await res.json();
      const fetched: PhotoItem[] = body.photos ?? [];
      // "확인함" 여부는 서버(DB)의 isNew 필드로 판별한다 — 어느 컴퓨터에서 조회해도 동일하게 유지됨
      const freshIds = new Set(fetched.filter(p => p.isNew).map(p => p.id));
      setAllLoadedPhotos(fetched);
      setNewPhotoIds(freshIds);
      setShowSeenPhotos(false);
      setPhotos(fetched.filter(p => freshIds.has(p.id)));
      setPhotosLoaded(true);
      setPhotoPage(1);
    } catch {
      alert('파일 목록을 불러오지 못했습니다.');
    } finally {
      setPhotosLoading(false);
    }
  };

  const toggleShowSeenPhotos = () => {
    setShowSeenPhotos(prev => {
      const next = !prev;
      setPhotos(next ? allLoadedPhotos : allLoadedPhotos.filter(p => newPhotoIds.has(p.id)));
      setPhotoPage(1);
      return next;
    });
  };

  const clearSeenPhotoHistory = async () => {
    if (!confirm('확인 기록을 초기화하면 다음 조회 시 모든 사진이 다시 "새 사진"으로 표시됩니다. 계속할까요?')) return;
    try {
      await fetch('/api/admin-reset-seen-photos', { method: 'POST' });
    } catch {
      alert('초기화에 실패했습니다.');
    }
  };
  const [grades, setGrades] = useState<Record<string, string>>(
    Object.fromEntries(data.personal.map(u => [u.id, u.grade ?? 'normal']))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const copyEmail = async (id: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // 클립보드 API를 사용할 수 없는 환경 대비 폴백
      const ta = document.createElement('textarea');
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(prev => (prev === id ? null : prev)), 1200);
  };

  // ── 비밀번호 초기화 ──
  const [pwQuery, setPwQuery] = useState('');
  const [pwResults, setPwResults] = useState<{ id: string; email: string; nickname: string | null; accountType: string; orgName: string | null; userId: string | null }[]>([]);
  const [pwSearching, setPwSearching] = useState(false);
  const [pwSearched, setPwSearched] = useState(false);
  const [pwResettingId, setPwResettingId] = useState<string | null>(null);
  const [pwResult, setPwResult] = useState<{ email: string; password: string } | null>(null);

  // 건의사항 상태
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>(data.suggestions ?? []);

  const toggleSuggestionRead = async (s: SuggestionRow) => {
    const next = !s.is_read;
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, is_read: next } : x));
    await fetch('/api/admin-suggestion', {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ id: s.id, is_read: next }),
    });
  };

  const deleteSuggestion = async (id: string) => {
    if (!confirm('이 건의사항을 삭제하시겠습니까?')) return;
    setSuggestions(prev => prev.filter(x => x.id !== id));
    await fetch('/api/admin-suggestion', {
      method: 'DELETE',
      headers: authHeader,
      body: JSON.stringify({ id }),
    });
  };

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

  const searchPwUsers = async () => {
    const q = pwQuery.trim();
    if (!q) return;
    setPwSearching(true);
    setPwResult(null);
    try {
      const res = await fetch(`/api/admin-reset-password?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      setPwResults(body.users ?? []);
    } catch {
      alert('검색에 실패했습니다.');
    } finally {
      setPwSearching(false);
      setPwSearched(true);
    }
  };

  const resetPassword = async (u: { id: string; email: string }) => {
    if (!confirm(`${u.email} 계정의 비밀번호를 초기화하시겠습니까?\n임시 비밀번호가 발급되며, 해당 회원에게 직접 전달해야 합니다.`)) return;
    setPwResettingId(u.id);
    setPwResult(null);
    try {
      const res = await fetch('/api/admin-reset-password', {
        method: 'POST', headers: authHeader, body: JSON.stringify({ userId: u.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '초기화 실패');
      setPwResult({ email: body.email ?? u.email, password: body.password });
    } catch (e: any) {
      alert(`오류: ${e?.message}`);
    } finally {
      setPwResettingId(null);
    }
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
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>
                <span style={{ color: '#2563EB' }}>Admin</span>
                <span style={{ color: '#1C1C1E' }}>Note</span>
              </span>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#9CA3AF' }}>관리자</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB' }}>
                총 방문자 {(data.totalVisits ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#ECFDF5', color: '#16A34A' }}>
                오늘 방문자 {(data.todayVisits ?? 0).toLocaleString()}
              </span>
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

        {/* 비밀번호 초기화 */}
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>비밀번호 초기화</h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px' }}>
            이메일 / 닉네임 / 기관명 / 공용폰 아이디로 검색 후 초기화하세요. 초기화하면 임시 비밀번호가 즉시 발급되며, 회원에게 직접 전달해야 합니다.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: (pwSearched || pwResult) ? 16 : 0 }}>
            <input
              value={pwQuery}
              onChange={e => setPwQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') searchPwUsers(); }}
              placeholder="이메일, 닉네임, 기관명, 아이디로 검색"
              style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 8 }}
            />
            <button
              onClick={searchPwUsers}
              disabled={pwSearching || !pwQuery.trim()}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: pwSearching ? 'default' : 'pointer', opacity: pwSearching || !pwQuery.trim() ? 0.6 : 1 }}
            >{pwSearching ? '검색 중...' : '검색'}</button>
          </div>

          {pwResult && (
            <div style={{ background: '#ECFDF5', border: '1px solid #16A34A', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#065F46' }}>
              <strong>{pwResult.email}</strong> 임시 비밀번호:{' '}
              <code style={{ fontSize: 14, fontWeight: 700, background: '#fff', padding: '2px 8px', borderRadius: 4 }}>{pwResult.password}</code>
              <button
                onClick={() => navigator.clipboard.writeText(pwResult.password)}
                style={{ marginLeft: 10, padding: '3px 10px', fontSize: 12, border: '1px solid #16A34A', borderRadius: 6, background: '#fff', color: '#16A34A', cursor: 'pointer' }}
              >복사</button>
              <div style={{ marginTop: 6, fontSize: 12, color: '#047857' }}>회원에게 안전한 방법으로 전달하고, 로그인 후 비밀번호 변경을 권장하세요.</div>
            </div>
          )}

          {pwSearched && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#F9FAFB' }}>
                  <th style={th}>이메일</th><th style={th}>닉네임/기관</th><th style={th}>유형</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {pwResults.length === 0
                    ? <tr><td colSpan={4} style={{ ...td, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>검색 결과 없음</td></tr>
                    : pwResults.map(u => (
                      <tr key={u.id}>
                        <td style={td}>{u.email}</td>
                        <td style={td}>{u.accountType === 'shared' ? `${u.orgName ?? '-'} / ${u.userId ?? '-'}` : (u.nickname ?? '-')}</td>
                        <td style={td}>{u.accountType === 'shared' ? '공용폰' : '개인회원'}</td>
                        <td style={td}>
                          <button
                            onClick={() => resetPassword(u)}
                            disabled={pwResettingId === u.id}
                            style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #EF4444', borderRadius: 6, background: '#fff', color: '#EF4444', cursor: pwResettingId === u.id ? 'default' : 'pointer', opacity: pwResettingId === u.id ? 0.6 : 1 }}
                          >{pwResettingId === u.id ? '처리 중...' : '초기화'}</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
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
                          // 번호(#)는 가입일 오름차순 기준 고정 번호(no) — 목록 표시 순서(최신순)와 무관
                          const currentGrade = grades[u.id] ?? 'normal';
                          return (
                            <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                              <td style={{ ...td, color: '#9CA3AF' }}>{u.no ?? '-'}</td>
                              <td style={td}>
                                <button
                                  onClick={() => copyEmail(u.id, u.email)}
                                  title="클릭하면 이메일이 복사됩니다"
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0,
                                    color: copiedEmailId === u.id ? '#16A34A' : '#374151',
                                    fontWeight: copiedEmailId === u.id ? 600 : 400,
                                  }}
                                >{copiedEmailId === u.id ? '복사됨 ✓' : u.email}</button>
                              </td>
                              <td style={td}>
                                <button
                                  onClick={() => setSelectedUser(u)}
                                  style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline', textDecorationColor: '#E5E7EB' }}
                                >{u.nickname}</button>
                              </td>
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
                  {(() => {
                    // 페이지 번호는 최대 10개까지만 보이고, 나머지는 ‹ › 로 넘긴다
                    const PAGE_WINDOW = 10;
                    let startPage = Math.max(1, personalPage - Math.floor(PAGE_WINDOW / 2));
                    let endPage = Math.min(totalPages, startPage + PAGE_WINDOW - 1);
                    startPage = Math.max(1, endPage - PAGE_WINDOW + 1);
                    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
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
                    ));
                  })()}
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

        {/* 공용폰 */}
        <div style={{ ...card, marginBottom: 24 }}>
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

        {/* 사진 갤러리 — 불러오기를 누를 때만 조회 (Egress 절감) */}
        {(() => {
          const totalPhotoPages = Math.ceil(photos.length / PHOTO_PAGE_SIZE);
          const pagedPhotos = photos.slice((photoPage - 1) * PHOTO_PAGE_SIZE, photoPage * PHOTO_PAGE_SIZE);
          const photoPageNums: number[] = [];
          if (totalPhotoPages <= 7) {
            for (let i = 1; i <= totalPhotoPages; i++) photoPageNums.push(i);
          } else {
            photoPageNums.push(1);
            if (photoPage > 3) photoPageNums.push(-1);
            for (let i = Math.max(2, photoPage - 1); i <= Math.min(totalPhotoPages - 1, photoPage + 1); i++) photoPageNums.push(i);
            if (photoPage < totalPhotoPages - 2) photoPageNums.push(-2);
            photoPageNums.push(totalPhotoPages);
          }
          return (
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: photosLoaded ? 8 : 0 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    전송된 파일 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{data.photoCount}건</span>
                  </h2>
                  {!photosLoaded && (
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
                      이미지 전송량을 아끼기 위해 필요할 때만 불러옵니다 (최근 {PHOTO_FETCH_LIMIT}건)
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!photosLoaded ? (
                    <button
                      onClick={loadPhotos}
                      disabled={photosLoading || data.photoCount === 0}
                      style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: photosLoading || data.photoCount === 0 ? 'default' : 'pointer', opacity: photosLoading || data.photoCount === 0 ? 0.6 : 1 }}
                    >{photosLoading ? '불러오는 중...' : '불러오기'}</button>
                  ) : (
                    <button onClick={loadPhotos} disabled={photosLoading} style={{ padding: '6px 14px', fontSize: 12, color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', cursor: photosLoading ? 'default' : 'pointer' }}>
                      {photosLoading ? '불러오는 중...' : '새로고침'}
                    </button>
                  )}
                </div>
              </div>
              {photosLoaded && allLoadedPhotos.length > newPhotoIds.size && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button
                    onClick={toggleShowSeenPhotos}
                    style={{ padding: '4px 10px', fontSize: 12, color: '#2563EB', border: '1px solid #DBEAFE', borderRadius: 6, background: '#EFF6FF', cursor: 'pointer' }}
                  >
                    {showSeenPhotos
                      ? '새 사진만 보기'
                      : `이미 확인한 사진 ${allLoadedPhotos.length - newPhotoIds.size}건 숨김 — 전체보기`}
                  </button>
                  <button onClick={clearSeenPhotoHistory} style={{ padding: 0, fontSize: 12, color: '#9CA3AF', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    확인 기록 초기화
                  </button>
                </div>
              )}
              {!photosLoaded ? null : photos.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0', margin: 0 }}>
                  {showSeenPhotos ? '파일 없음' : '새로 확인할 사진이 없습니다.'}
                </p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {pagedPhotos.map(p => {
                      const isDeleted = !!p.deletedAt;
                      return (
                        <div
                          key={p.id}
                          onClick={() => p.fullUrl && setSelectedPhoto(p)}
                          style={{
                            borderRadius: 10, overflow: 'hidden',
                            border: `1px solid ${isDeleted ? '#FCA5A5' : '#F3F4F6'}`,
                            position: 'relative',
                            cursor: p.fullUrl ? 'pointer' : 'default',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => { if (p.fullUrl) { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; } }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                        >
                          {p.thumbUrl ? (
                            <img src={p.thumbUrl} alt={p.fileName}
                              loading="lazy" decoding="async"
                              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ width: '100%', aspectRatio: '1', background: isDeleted ? '#FEE2E2' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 32 }}>📄</span>
                            </div>
                          )}
                          {isDeleted && (
                            <div style={{
                              position: 'absolute', top: 6, right: 6,
                              background: '#EF4444', color: '#fff',
                              fontSize: 10, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 99,
                            }}>
                              유저 삭제
                            </div>
                          )}
                          <div style={{ padding: '6px 8px', background: isDeleted ? '#FFF5F5' : '#fff' }}>
                            <div style={{ fontSize: 11, color: isDeleted ? '#9CA3AF' : '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.fileName}
                            </div>
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                              {p.uploaderName !== '-' ? p.uploaderName : p.uploaderEmail.split('@')[0]}
                            </div>
                            <div style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.uploaderEmail}
                            </div>
                            <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                              {fmt(p.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 페이지네이션 */}
                  {totalPhotoPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 16 }}>
                      <button
                        onClick={() => setPhotoPage(p => Math.max(1, p - 1))}
                        disabled={photoPage === 1}
                        style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: photoPage === 1 ? 'default' : 'pointer', opacity: photoPage === 1 ? 0.4 : 1 }}
                      >‹</button>
                      {photoPageNums.map((n, i) =>
                        n < 0 ? (
                          <span key={n} style={{ padding: '5px 4px', fontSize: 13, color: '#9CA3AF' }}>…</span>
                        ) : (
                          <button
                            key={n}
                            onClick={() => setPhotoPage(n)}
                            style={{
                              padding: '5px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                              border: photoPage === n ? '1.5px solid #6366F1' : '1px solid #E5E7EB',
                              background: photoPage === n ? '#6366F1' : '#fff',
                              color: photoPage === n ? '#fff' : '#374151',
                              fontWeight: photoPage === n ? 700 : 400,
                            }}
                          >{n}</button>
                        )
                      )}
                      <button
                        onClick={() => setPhotoPage(p => Math.min(totalPhotoPages, p + 1))}
                        disabled={photoPage === totalPhotoPages}
                        style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: photoPage === totalPhotoPages ? 'default' : 'pointer', opacity: photoPage === totalPhotoPages ? 0.4 : 1 }}
                      >›</button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* 건의사항 */}
        {(() => {
          const unread = suggestions.filter(s => !s.is_read).length;
          return (
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>건의사항</h2>
                <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{suggestions.length}건</span>
                {unread > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#EF4444', color: '#fff', borderRadius: 99, padding: '2px 8px' }}>
                    미확인 {unread}
                  </span>
                )}
              </div>
              {suggestions.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0', margin: 0 }}>접수된 건의사항이 없습니다</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {suggestions.map(s => (
                    <div key={s.id} style={{
                      border: `1px solid ${s.is_read ? '#F3F4F6' : '#BFDBFE'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      background: s.is_read ? '#fff' : '#EFF6FF',
                    }}>
                      {/* 상단: 작성자 + 날짜 + 버튼들 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                            {s.user_nickname || s.user_email?.split('@')[0] || '-'}
                          </span>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.user_email}</span>
                          {!s.is_read && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#3B82F6', color: '#fff', borderRadius: 99, padding: '1px 7px' }}>NEW</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmt(s.created_at)}</span>
                          {/* 확인/미확인 토글 버튼 */}
                          <button
                            onClick={() => toggleSuggestionRead(s)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
                              background: s.is_read ? '#F3F4F6' : '#3B82F6',
                              color: s.is_read ? '#6B7280' : '#fff',
                            }}
                          >
                            {s.is_read ? '미확인' : '확인'}
                          </button>
                          {/* 삭제 버튼 */}
                          <button
                            onClick={() => deleteSuggestion(s.id)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
                              background: '#FEE2E2', color: '#EF4444',
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      {/* 내용 */}
                      <p style={{ margin: 0, fontSize: 14, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* 회원 데이터 모달 */}
        {selectedUser && (
          <UserDataModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}

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
        <div style={{ ...card, marginBottom: 24 }}>
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

        {/* 전체 이력 현황 */}
        <AllHistoriesSection card={card} />

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

      </div>
    </div>
  );
}
