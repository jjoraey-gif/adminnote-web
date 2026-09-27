import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * /stock 전용 Supabase 클라이언트.
 * AdminNote 앱 로그인과 섞이지 않도록 별도 프로젝트(환경변수)와 별도 세션 저장 키를 사용한다.
 * 데이터 보호는 DB의 RLS(소유자만 조회·설정 변경)가 담당한다.
 */
let client: SupabaseClient | null = null;

export function stockSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_STOCK_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_STOCK_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_STOCK_SUPABASE_URL / _ANON_KEY 환경변수가 없습니다.');
  client = createClient(url, key, {
    auth: {
      storageKey: 'stock-auth',
      persistSession: true,
      autoRefreshToken: true,
      // 탭(브라우저)을 닫으면 로그아웃 → 다시 열 때 PIN 입력
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    },
  });
  return client;
}
