import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 닉네임 / 기관이름 중복 판정 규칙 (한 곳에서만 정의한다)
 *
 * - 개인회원: nickname 이 유일해야 한다
 * - 공용폰:   org_name(기관이름) 이 유일해야 한다
 *
 * 앞뒤 공백과 대소문자는 무시하고 비교한다. "서울시청"과 "서울시청 ",
 * "AdminNote"와 "adminnote"를 서로 다른 값으로 취급하면 중복을 막는 의미가 없다.
 */

/** 비교용으로 값을 정규화 */
export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 해당 컬럼에 같은 값이 이미 쓰이고 있는지 확인한다.
 *
 * ilike는 대소문자를 무시하지만 값에 %나 _가 들어 있으면 와일드카드로 해석돼
 * 실제보다 넓게 매칭될 수 있다. 넓게 잡히는 건 괜찮으므로(누락은 발생하지 않는다)
 * 후보를 받아온 뒤 정규화 비교로 최종 판정한다.
 */
export async function isTaken(
  supabase: SupabaseClient,
  column: 'nickname' | 'org_name',
  value: string,
): Promise<boolean> {
  const target = normalizeName(value);
  if (!target) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select(column)
    .ilike(column, value.trim())
    .limit(50);

  if (error) {
    // 확인에 실패했으면 통과시키지 않고 호출 측에서 판단하도록 예외를 던진다
    throw error;
  }

  return (data ?? []).some((row) => {
    const v = (row as Record<string, unknown>)[column];
    return typeof v === 'string' && normalizeName(v) === target;
  });
}
