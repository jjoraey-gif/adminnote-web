import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeEqual } from '@/lib/admin-auth';

export const maxDuration = 60;

/** 사진 보관기간 — 업로드 후 이 기간이 지나면 삭제한다 */
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
/** 유저가 삭제한 파일은 관리자 조회를 위해 이 기간만큼 유예 (admin-photos API와 동일해야 함) */
const DELETE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** 한 번 실행에서 처리할 최대 건수 — 함수 실행시간 초과를 막는다 */
const MAX_PER_RUN = 2000;
/** Storage·DB 삭제 요청 한 번에 보낼 건수 */
const CHUNK = 500;
/** PostgREST 한 번 조회 상한 */
const PAGE = 1000;

interface PhotoRow {
  id: string;
  file_path: string;
  thumb_path: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 정리 대상 후보를 전부 가져온다.
 *
 * PostgREST는 한 번에 1000건까지만 주기 때문에 range로 이어 받는다.
 * 이 페이징이 없으면 쌓인 사진이 1000건씩만 줄어든다.
 */
async function fetchCandidates(supabase: SupabaseClient, nowIso: string): Promise<PhotoRow[]> {
  const all: PhotoRow[] = [];
  for (let from = 0; from < MAX_PER_RUN * 3; from += PAGE) {
    const { data, error } = await supabase
      .from('photo_transfers')
      .select('id, file_path, thumb_path, expires_at, deleted_at, created_at')
      // expires_at이 비어 있는 레코드(구버전 앱 업로드분)도 후보에 포함해야 한다
      .or(`expires_at.is.null,expires_at.lt.${nowIso},deleted_at.not.is.null`)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as PhotoRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

// 매일 자정 실행 — 만료된 사진 정리
export async function GET(request: Request) {
  // CRON_SECRET 미설정 시 무조건 거부 (설정 누락으로 인한 인증 우회 방지)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cleanup-photos] CRON_SECRET 환경변수 미설정');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Vercel Cron 보안 헤더 검증 (상수 시간 비교)
  const authHeader = request.headers.get('authorization');
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const deleteGraceThresholdIso = new Date(now - DELETE_GRACE_MS).toISOString();

  let candidates: PhotoRow[];
  try {
    candidates = await fetchCandidates(adminSupabase, nowIso);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    console.error('[cleanup-photos] DB 조회 실패:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  /**
   * 실제 영구 삭제 대상 판별
   * - 유저가 삭제한 경우: 삭제 후 3일이 지나야 영구 삭제 (그 전에는 관리자가 조회 가능해야 함)
   * - 그 외: 만료 시각이 지나면 삭제
   *
   * ※ expires_at이 비어 있으면 업로드 시각 + 보관기간으로 계산한다.
   *   구버전 앱은 expires_at을 넣지 않고 올리기 때문에, 이 보정이 없으면
   *   해당 사진들이 영원히 삭제되지 않고 쌓인다.
   */
  const expiryOf = (r: PhotoRow): number =>
    r.expires_at ? Date.parse(r.expires_at) : Date.parse(r.created_at) + RETENTION_MS;

  const expired = candidates
    .filter(r => (r.deleted_at ? r.deleted_at < deleteGraceThresholdIso : expiryOf(r) < now))
    .slice(0, MAX_PER_RUN);

  if (expired.length === 0) {
    return NextResponse.json({ deleted: 0, message: '삭제할 항목 없음' });
  }

  // Storage에서 파일 삭제 — 원본 + 썸네일. 한 번에 너무 많이 보내면 요청이 실패한다.
  const filePaths = expired.flatMap(r => (r.thumb_path ? [r.file_path, r.thumb_path] : [r.file_path]));
  for (const paths of chunk(filePaths, CHUNK)) {
    const { error: storageErr } = await adminSupabase.storage.from('photo-transfers').remove(paths);
    if (storageErr) console.error('[cleanup-photos] Storage 삭제 실패:', storageErr.message);
  }

  // DB 레코드 삭제
  // Storage 삭제가 일부 실패해도 레코드는 지운다 — 남겨두면 매번 같은 건을 재시도하며 진행이 막힌다.
  let deleted = 0;
  for (const ids of chunk(expired.map(r => r.id), CHUNK)) {
    const { error: dbErr } = await adminSupabase.from('photo_transfers').delete().in('id', ids);
    if (dbErr) {
      console.error('[cleanup-photos] DB 삭제 실패:', dbErr.message);
      return NextResponse.json({ deleted, error: dbErr.message }, { status: 500 });
    }
    deleted += ids.length;
  }

  // 한 번에 다 못 지웠으면 남은 건수를 알려준다 (다음 실행에서 이어서 처리)
  const remaining = Math.max(0, candidates.length - expired.length);
  console.log(`[cleanup-photos] ${deleted}개 삭제 완료, 잔여 후보 ${remaining}개`);
  return NextResponse.json({ deleted, remaining });
}
