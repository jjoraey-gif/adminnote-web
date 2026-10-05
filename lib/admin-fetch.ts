import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * 1000건 한도 없이 전체를 가져오는 조회 헬퍼.
 *
 * Supabase는 두 곳에서 1000건 제한이 걸린다.
 *  - auth.admin.listUsers: perPage 최대 1000
 *  - PostgREST(from().select()): 기본 응답 상한 1000행
 *
 * 회원이 1000명을 넘으면서 관리자 페이지의 회원 수가 1000에서 멈추고,
 * 1000번째 이후 가입자의 닉네임이 '-'로 보이는 문제가 있었다.
 * (프로필을 못 가져와 기본값으로 떨어졌기 때문)
 */

const PAGE = 1000;
// 혹시 모를 무한 루프 방지 — 100페이지 = 10만 건
const MAX_PAGES = 100;

/** auth.users 전체를 페이지를 넘겨가며 모두 가져온다 */
export async function listAllAuthUsers(
  supabase: SupabaseClient,
): Promise<{ users: User[]; error: string | null }> {
  const all: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) {
      // 일부라도 받았으면 그것까지는 살려서 돌려준다
      return { users: all, error: error.message };
    }
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < PAGE) break;
  }

  return { users: all, error: null };
}

/** 테이블 전체를 range로 나눠 모두 가져온다 */
export async function selectAllRows<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<{ rows: T[]; error: string | null }> {
  const all: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);

    if (error) {
      return { rows: all, error: error.message };
    }
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }

  return { rows: all, error: null };
}
