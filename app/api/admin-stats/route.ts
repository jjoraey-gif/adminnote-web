import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';
import { selectAllRows } from '@/lib/admin-fetch';

/**
 * 기능별 이용 통계
 *
 * 이용자가 어떤 기능을 쓰는지 집계한다. 별도의 사용 기록을 수집하지 않고,
 * 이미 동기화되어 있는 데이터에 "값이 들어 있는지"만 세는 방식이다.
 *
 * ※ 이 API는 어떤 경우에도 개별 내용을 반환하지 않는다.
 *   일정 제목, 이력 내용, 연락처 같은 값은 읽더라도 개수만 세고 버린다.
 *   관리자 화면에서 개인 데이터를 조회하는 기능은 제공하지 않기로 한 원칙을 지킨다.
 */

export const maxDuration = 60;

/** 집계할 기능 목록 — 스냅샷의 어떤 키를 보고 "쓰고 있다"로 판단할지 */
const FEATURES: { key: string; label: string; sources: string[] }[] = [
  { key: 'schedule',  label: '업무일정',        sources: ['events'] },
  { key: 'todo',      label: '오늘 할 일',      sources: ['todos'] },
  { key: 'budget',    label: '예산관리',        sources: ['subProjects'] },
  { key: 'history',   label: '이력관리',        sources: ['promotions', 'assignments', 'awards'] },
  { key: 'promotion', label: '승진순위관리',    sources: ['performanceRatings', 'pastPerformanceRatings', 'sameGradePromotions'] },
  { key: 'org',       label: '부서조직도',      sources: ['orgDepartments'] },
  { key: 'contact',   label: '외부연락처',      sources: ['externalContacts'] },
  { key: 'memo',      label: '메모',            sources: ['memos'] },
];

/** on/off 설정으로 사용 여부를 판단하는 기능 */
const TOGGLES: { key: string; label: string; source: string }[] = [
  { key: 'overtime', label: '초과근무 기록알람', source: 'an_overtime_settings' },
  { key: 'anniv',    label: '이력 기념일 알림',  source: 'an_career_anniv_settings' },
];

function countOf(data: Record<string, unknown>, key: string): number {
  const v = data[key];
  if (Array.isArray(v)) return v.length;
  return 0;
}

export async function GET() {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { rows: snapshots, error } = await selectAllRows<{
    user_id: string; data: Record<string, unknown> | null; updated_at: string;
  }>(adminSupabase, 'user_snapshots', 'user_id, data, updated_at');

  if (error) {
    console.error('[admin-stats] 스냅샷 조회 실패:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let active7 = 0;
  let active30 = 0;

  // 기능별 누적 — 쓰는 사람 수와 전체 건수
  const tally: Record<string, { users: number; total: number }> = {};
  [...FEATURES, ...TOGGLES].forEach(f => { tally[f.key] = { users: 0, total: 0 }; });

  for (const row of snapshots) {
    const data = row.data ?? {};

    const updated = Date.parse(row.updated_at);
    if (!Number.isNaN(updated)) {
      if (now - updated <= 7 * DAY) active7++;
      if (now - updated <= 30 * DAY) active30++;
    }

    for (const f of FEATURES) {
      const count = f.sources.reduce((sum, key) => sum + countOf(data, key), 0);
      if (count > 0) {
        tally[f.key].users++;
        tally[f.key].total += count;
      }
    }

    for (const t of TOGGLES) {
      const s = data[t.source] as { enabled?: boolean } | undefined;
      if (s && typeof s === 'object' && s.enabled) {
        tally[t.key].users++;
        tally[t.key].total++;
      }
    }
  }

  const totalUsers = snapshots.length;
  const ratio = (n: number) => (totalUsers > 0 ? Math.round((n / totalUsers) * 1000) / 10 : 0);

  const features = [...FEATURES, ...TOGGLES].map(f => {
    const t = tally[f.key];
    return {
      key: f.key,
      label: f.label,
      users: t.users,
      ratio: ratio(t.users),
      total: t.total,
      avg: t.users > 0 ? Math.round((t.total / t.users) * 10) / 10 : 0,
    };
  }).sort((a, b) => b.users - a.users);

  /**
   * 사진전송·무음카메라
   *
   * 사진 기록은 보관기간이 지나면 지워지므로, 정리 작업이 지우기 직전에
   * usage_counters에 건수를 적립해둔다. 현재 보관 중인 건수와 합쳐야 누적값이 된다.
   */
  const { rows: live } = await selectAllRows<{ user_id: string; file_size: number | null; source: string | null }>(
    adminSupabase, 'photo_transfers', 'user_id, file_size, source',
  );
  const { rows: counters } = await selectAllRows<{
    user_id: string; feature: string; count: number; bytes: number; last_used_at: string | null;
  }>(adminSupabase, 'usage_counters', 'user_id, feature, count, bytes, last_used_at');

  const media: Record<string, { users: Set<string>; files: number; bytes: number; recent30: Set<string> }> = {
    photo_transfer: { users: new Set(), files: 0, bytes: 0, recent30: new Set() },
    silent_camera:  { users: new Set(), files: 0, bytes: 0, recent30: new Set() },
  };

  // 아직 보관 중인 사진
  for (const r of live) {
    const f = r.source === 'silent_camera' ? 'silent_camera' : 'photo_transfer';
    media[f].users.add(r.user_id);
    media[f].recent30.add(r.user_id);
    media[f].files += 1;
    media[f].bytes += r.file_size ?? 0;
  }
  // 이미 지워진 뒤 적립된 집계
  for (const c of counters) {
    const m = media[c.feature];
    if (!m) continue;
    m.users.add(c.user_id);
    m.files += Number(c.count) || 0;
    m.bytes += Number(c.bytes) || 0;
    if (c.last_used_at && now - Date.parse(c.last_used_at) <= 30 * DAY) m.recent30.add(c.user_id);
  }

  const mediaStat = (key: string) => {
    const m = media[key];
    return {
      users: m.users.size,
      ratio: ratio(m.users.size),
      recent30: m.recent30.size,
      files: m.files,
      gb: Math.round((m.bytes / 1024 / 1024 / 1024) * 100) / 100,
    };
  };

  return NextResponse.json({
    totalUsers,
    active7,
    active30,
    features,
    photoTransfer: mediaStat('photo_transfer'),
    silentCamera: mediaStat('silent_camera'),
    generatedAt: new Date().toISOString(),
  });
}
