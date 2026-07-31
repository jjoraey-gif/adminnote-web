// ─────────────────────────────────────────────
// Signed URL 캐시 (localStorage)
//
// Supabase Storage의 createSignedUrl(s)는 호출마다 토큰이 다른 새 URL을 만든다.
// CDN/브라우저 캐시는 URL 문자열 전체를 키로 쓰기 때문에, 같은 파일을 볼 때마다
// 새 URL을 발급하면 매번 "처음 보는 URL"이 되어 캐시가 전혀 히트되지 않고
// 원본을 통째로 다시 받아온다 (Egress 낭비의 핵심 원인).
//
// 발급받은 URL을 만료 전까지 재사용하면, 같은 파일을 다시 볼 때 같은 URL을 쓰게 되어
// 캐시가 실제로 동작한다.
// ─────────────────────────────────────────────

const STORAGE_KEY = 'an_signed_url_cache_v1';
// 만료 직전 URL을 재사용하다가 요청 도중 만료되는 상황을 피하기 위한 여유 시간
const SAFETY_MARGIN_MS = 60_000;

interface CacheEntry { url: string; expiresAt: number; }
type Cache = Record<string, CacheEntry>;

function readCache(): Cache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // 저장 공간 부족 등은 무시 — 캐시 없이도 매번 새로 발급하는 것뿐, 기능엔 문제없음
  }
}

/** 캐시에 유효한(만료 전) signed URL이 있으면 반환, 없으면 null. */
export function getCachedSignedUrl(path: string): string | null {
  const entry = readCache()[path];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt - SAFETY_MARGIN_MS) return null;
  return entry.url;
}

/** 여러 파일의 signed URL을 한 번에 캐시에 저장. */
export function setCachedSignedUrls(
  entries: { path: string; url: string; expiresInSeconds: number }[],
): void {
  if (entries.length === 0) return;
  const cache = readCache();
  const now = Date.now();
  for (const e of entries) cache[e.path] = { url: e.url, expiresAt: now + e.expiresInSeconds * 1000 };
  writeCache(cache);
}

/** 더 이상 목록에 없거나 만료된 캐시 항목을 정리 (무한 증가 방지). */
export function pruneSignedUrlCache(keepPaths: string[]): void {
  const keep = new Set(keepPaths);
  const cache = readCache();
  const now = Date.now();
  let changed = false;
  for (const path of Object.keys(cache)) {
    if (!keep.has(path) || now > cache[path].expiresAt) {
      delete cache[path];
      changed = true;
    }
  }
  if (changed) writeCache(cache);
}
