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
interface ResetRequestRow {
  id: string; email: string; status: string; created_at: string; handled_at: string | null;
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
  resetRequests?: ResetRequestRow[];
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


// ── 기능별 이용 통계 ─────────────────────────────────────────────────────────
//
// 별도의 사용 기록을 수집하지 않고, 이미 동기화된 데이터에 값이 들어 있는지만 센다.
// 개별 내용은 서버에서도 숫자로만 집계해 내려오므로 이 화면에서 볼 수 없다.

interface FeatureStat {
  key: string; label: string; users: number; ratio: number; total: number; avg: number;
}
interface MediaStat {
  users: number; ratio: number; recent30: number; files: number; gb: number;
}
interface StatsData {
  totalUsers: number;
  active7: number;
  active30: number;
  features: FeatureStat[];
  photoTransfer: MediaStat;
  silentCamera: MediaStat;
}

function UsageStatsSection({ card }: { card: React.CSSProperties }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-stats');
      const body = await res.json();
      setStats(res.ok ? body : null);
    } catch { setStats(null); }
    setLoading(false);
    setLoaded(true);
  };

  const max = stats ? Math.max(1, ...stats.features.map(f => f.users)) : 1;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>기능별 이용 통계</h2>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: loading ? '#F3F4F6' : '#fff', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'default' : 'pointer', color: '#374151',
          }}
        >{loading ? '집계 중...' : loaded ? '다시 집계' : '집계하기'}</button>
      </div>

      {!loaded && !loading && (
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
          전체 회원 데이터를 훑어 집계합니다. 회원 수에 따라 몇 초 걸릴 수 있습니다.
        </p>
      )}

      {loaded && !stats && (
        <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>집계에 실패했습니다.</p>
      )}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
            {[
              ['데이터 보유 회원', `${stats.totalUsers.toLocaleString()}명`],
              ['최근 7일 활동', `${stats.active7.toLocaleString()}명`],
              ['최근 30일 활동', `${stats.active30.toLocaleString()}명`],
              ['사진전송 이용', `${stats.photoTransfer.users.toLocaleString()}명`],
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* 사진 기능 — 건수·용량이 함께 의미가 있어 따로 보여준다 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
            {([
              ['사진전송 (직접 업로드)', stats.photoTransfer],
              ['무음카메라 (자동 전송)', stats.silentCamera],
            ] as const).map(([label, m]) => (
              <div key={label} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                  누적 이용자 <b>{m.users.toLocaleString()}명</b> ({m.ratio}%)<br />
                  최근 30일 <b>{m.recent30.toLocaleString()}명</b><br />
                  누적 <b>{m.files.toLocaleString()}건</b> · {m.gb}GB
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.features.map(f => (
              <div key={f.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{f.label}</span>
                  <span style={{ fontSize: 13, color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
                    {f.users.toLocaleString()}명 ({f.ratio}%)
                    {f.avg > 1 && <span style={{ color: '#9CA3AF' }}> · 1인당 {f.avg}건</span>}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(f.users / max) * 100}%`, height: '100%',
                    borderRadius: 999, background: '#2563EB',
                  }} />
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.7, marginTop: 18, marginBottom: 0 }}>
            · 해당 기능에 데이터를 1건 이상 등록한 회원 수입니다. 알림 기능은 켜둔 회원 수입니다.<br />
            · 사진 기능은 보관기간이 지나 파일을 지울 때 건수만 따로 적립해 누적값을 유지합니다.<br />
            · 무음카메라는 자동 전송을 켠 경우만 집계됩니다. 꺼두고 쓰면 기기에만 남아 알 수 없습니다.<br />
            · 업무사진관리·문서스캔보관함은 서버로 전송되지 않아 집계할 수 없습니다.
          </p>
        </>
      )}
    </div>
  );
}

export default function AdminDashboard({ data }: { data: AdminData }) {
  const router = useRouter();
  // 인증은 httpOnly 쿠키(path: '/')로 자동 전송됨 — 토큰을 클라이언트에 두지 않는다
  const authHeader = { 'Content-Type': 'application/json' };
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [personalPage, setPersonalPage] = useState(1);
  // 개인회원 검색 — 이메일/닉네임으로 거른다 (등급 변경 대상을 빨리 찾기 위함)
  const [personalQuery, setPersonalQuery] = useState('');
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

  // ── 비밀번호 초기화 요청 ──
  const [resetRequests, setResetRequests] = useState<ResetRequestRow[]>(data.resetRequests ?? []);

  const toggleResetRequestDone = async (r: ResetRequestRow) => {
    const done = r.status !== 'done';
    setResetRequests(prev => prev.map(x => x.id === r.id
      ? { ...x, status: done ? 'done' : 'pending', handled_at: done ? new Date().toISOString() : null }
      : x));
    await fetch('/api/admin-reset-requests', {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ id: r.id, done }),
    });
  };

  const deleteResetRequest = async (id: string) => {
    if (!confirm('이 요청을 목록에서 삭제하시겠습니까?')) return;
    setResetRequests(prev => prev.filter(x => x.id !== id));
    await fetch('/api/admin-reset-requests', {
      method: 'DELETE',
      headers: authHeader,
      body: JSON.stringify({ id }),
    });
  };

  // 요청 목록의 이메일을 눌러 비밀번호 초기화 검색창으로 바로 넘긴다
  const useEmailForReset = (email: string) => {
    copyEmail(`req-${email}`, email);
    setPwQuery(email);
    setPwResults([]);
    setPwSearched(false);
    setPwResult(null);
    document.getElementById('pw-reset-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

        {/* 비밀번호 초기화 요청 */}
        {(() => {
          const pending = resetRequests.filter(r => r.status !== 'done');
          return (
            <div style={{ ...card, marginBottom: 24, ...(pending.length > 0 ? { border: '1px solid #FCA5A5' } : {}) }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                비밀번호 초기화 요청
                {pending.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEE2E2', color: '#DC2626' }}>
                    미처리 {pending.length}
                  </span>
                )}
                <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>{resetRequests.length}건</span>
              </h2>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px' }}>
                사용자가 로그인 화면에서 초기화를 요청한 목록입니다. 이메일을 누르면 복사되고 아래 초기화 검색창에 자동 입력됩니다.
                임시 비밀번호를 발급해 메일로 보낸 뒤 &quot;처리완료&quot;를 눌러주세요. (안내 문구: 24시간 내 전송)
              </p>

              {resetRequests.length === 0 ? (
                <p style={{ fontSize: 13, color: '#C7C7CC', margin: 0 }}>아직 요청이 없습니다.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>상태</th>
                        <th style={th}>이메일</th>
                        <th style={th}>요청일시</th>
                        <th style={th}>처리일시</th>
                        <th style={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resetRequests.map(r => {
                        const done = r.status === 'done';
                        return (
                          <tr key={r.id} style={done ? { opacity: 0.55 } : undefined}>
                            <td style={td}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                background: done ? '#F3F4F6' : '#FEE2E2',
                                color: done ? '#6B7280' : '#DC2626',
                              }}>
                                {done ? '처리완료' : '미처리'}
                              </span>
                            </td>
                            <td
                              style={{ ...td, cursor: 'pointer', color: '#2563EB', fontWeight: 600 }}
                              onClick={() => useEmailForReset(r.email)}
                              title="클릭하면 복사되고 초기화 검색창에 입력됩니다"
                            >
                              {copiedEmailId === `req-${r.email}` ? '복사됨 ✓' : r.email}
                            </td>
                            <td style={td}>
                              {new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </td>
                            <td style={td}>
                              {r.handled_at ? new Date(r.handled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}
                            </td>
                            <td style={{ ...td, textAlign: 'right' }}>
                              <button
                                onClick={() => toggleResetRequestDone(r)}
                                style={{
                                  padding: '5px 12px', fontSize: 12, fontWeight: 600, marginRight: 6,
                                  border: '1px solid #E5E7EB', borderRadius: 7, cursor: 'pointer',
                                  background: done ? '#fff' : '#2563EB', color: done ? '#6B7280' : '#fff',
                                }}
                              >
                                {done ? '미처리로' : '처리완료'}
                              </button>
                              <button
                                onClick={() => deleteResetRequest(r.id)}
                                style={{
                                  padding: '5px 10px', fontSize: 12, border: '1px solid #E5E7EB',
                                  borderRadius: 7, background: '#fff', color: '#EF4444', cursor: 'pointer',
                                }}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* 비밀번호 초기화 */}
        <div id="pw-reset-section" style={{ ...card, marginBottom: 24 }}>
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
          const q = personalQuery.trim().toLowerCase();
          const list = q
            ? data.personal.filter(u =>
                (u.email ?? '').toLowerCase().includes(q) ||
                (u.nickname ?? '').toLowerCase().includes(q))
            : data.personal;
          const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
          // 검색 결과가 줄어 현재 페이지가 범위를 벗어나면 마지막 페이지로 맞춘다
          const curPage = Math.min(personalPage, totalPages);
          const paged = list.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
          return (
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '0 0 16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  개인회원 <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>
                    {q ? `${list.length}명 / 전체 ${data.personalCount}명` : `${data.personalCount}명`}
                  </span>
                </h2>
                <div style={{ position: 'relative' }}>
                  <input
                    value={personalQuery}
                    onChange={e => { setPersonalQuery(e.target.value); setPersonalPage(1); }}
                    placeholder="이메일 또는 닉네임 검색"
                    style={{
                      width: 260, padding: '7px 30px 7px 12px', fontSize: 13,
                      border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none',
                    }}
                  />
                  {personalQuery && (
                    <button
                      onClick={() => { setPersonalQuery(''); setPersonalPage(1); }}
                      title="검색어 지우기"
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9CA3AF', fontSize: 14, lineHeight: 1, padding: 0,
                      }}
                    >✕</button>
                  )}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#F9FAFB' }}>
                    <th style={th}>#</th><th style={th}>이메일</th><th style={th}>닉네임</th>
                    <th style={th}>로그인 방식</th><th style={th}>가입일</th><th style={th}>등급</th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0
                      ? <tr><td colSpan={6} style={{ ...td, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>
                          {q ? `"${personalQuery.trim()}" 검색 결과가 없습니다` : '없음'}
                        </td></tr>
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
                    onClick={() => setPersonalPage(Math.max(1, curPage - 1))}
                    disabled={curPage === 1}
                    style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: curPage === 1 ? 'default' : 'pointer', opacity: curPage === 1 ? 0.4 : 1 }}
                  >‹</button>
                  {(() => {
                    // 페이지 번호는 최대 10개까지만 보이고, 나머지는 ‹ › 로 넘긴다
                    const PAGE_WINDOW = 10;
                    let startPage = Math.max(1, curPage - Math.floor(PAGE_WINDOW / 2));
                    const endPage = Math.min(totalPages, startPage + PAGE_WINDOW - 1);
                    startPage = Math.max(1, endPage - PAGE_WINDOW + 1);
                    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                      <button
                        key={page}
                        onClick={() => setPersonalPage(page)}
                        style={{
                          padding: '5px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                          border: page === curPage ? '1px solid #2563EB' : '1px solid #E5E7EB',
                          background: page === curPage ? '#2563EB' : '#fff',
                          color: page === curPage ? '#fff' : '#374151',
                          fontWeight: page === curPage ? 700 : 400,
                        }}
                      >{page}</button>
                    ));
                  })()}
                  <button
                    onClick={() => setPersonalPage(Math.min(totalPages, curPage + 1))}
                    disabled={curPage === totalPages}
                    style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: curPage === totalPages ? 'default' : 'pointer', opacity: curPage === totalPages ? 0.4 : 1 }}
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

        {/* 기능별 이용 통계 */}
        <UsageStatsSection card={card} />

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
