// ─────────────────────────────────────────────
// 관리자 페이지 "확인한 사진" 기록 (localStorage)
//
// 관리자가 사진 목록을 "새로고침"할 때마다 같은 사진의 signed URL이 새로 발급되어
// 브라우저가 매번 썸네일을 다시 내려받는다. 한 번 목록에 표시된 사진은 "확인함"으로
// 기록해두고, 다음 조회부터는 새로 추가된 사진만 보여줘서 반복 다운로드로 인한
// Egress 낭비를 줄인다.
// ─────────────────────────────────────────────

const STORAGE_KEY = 'an_admin_seen_photos_v1';
// 무한정 쌓이는 것을 막기 위한 최대 보관 개수 (오래된 것부터 정리)
const MAX_ENTRIES = 2000;

function readSeen(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_ENTRIES)));
  } catch {
    // 저장 실패는 무시 — 다음 조회 때 다시 보이는 것뿐, 기능엔 문제없음
  }
}

/** 지금까지 "확인함"으로 기록된 사진 id 목록. */
export function getSeenPhotoIds(): Set<string> {
  return new Set(readSeen());
}

/** 새로 표시한 사진들의 id를 "확인함"으로 기록. */
export function markPhotosSeen(ids: string[]): void {
  if (ids.length === 0) return;
  const existing = readSeen();
  const merged = Array.from(new Set([...existing, ...ids]));
  writeSeen(merged);
}

/** 확인 기록 전체 초기화 — 필요 시 관리자가 다시 처음부터 보고 싶을 때 사용. */
export function resetSeenPhotos(): void {
  writeSeen([]);
}
