-- ═══════════════════════════════════════════════════════════════════════════
-- AdminNote 보안 수정 SQL
-- 실행: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ 실행 전에 "0단계 진단"을 먼저 돌려서 현재 상태를 확인하세요.
--    이미 적용된 항목은 건너뛰어도 됩니다. 모든 문장은 재실행 가능(idempotent)합니다.


-- ───────────────────────────────────────────────────────────────────────────
-- 0단계. 진단 — 현재 RLS 상태 확인 (읽기 전용, 안전)
-- ───────────────────────────────────────────────────────────────────────────

-- (0-a) RLS가 꺼져 있는 테이블 찾기 → relrowsecurity = false 인 것이 위험
SELECT relname AS 테이블, relrowsecurity AS "RLS_활성화"
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relrowsecurity, relname;

-- (0-b) 현재 정책 전량
SELECT tablename AS 테이블, policyname AS 정책명, cmd AS 명령,
       roles AS 대상역할, qual AS "USING조건", with_check AS "WITH_CHECK조건"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- (0-c) SECURITY DEFINER 함수의 실행 권한 확인
SELECT p.proname AS 함수명,
       pg_get_userbyid(p.proowner) AS 소유자,
       p.prosecdef AS "SECURITY_DEFINER",
       p.proconfig AS "search_path설정",
       array_to_string(p.proacl, ', ') AS 권한
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef = true;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1단계. notices — 일반 회원의 쓰기 권한 제거  【Critical】
-- ═══════════════════════════════════════════════════════════════════════════
-- 문제: "for all using (auth.role() = 'authenticated')" 정책 때문에
--       일반 앱 회원 누구나 공지사항을 생성/수정/삭제할 수 있었음.
-- 해결: 읽기 정책만 남기고 쓰기는 service_role(관리자 API)로만 허용.
--       service_role은 RLS를 우회하므로 별도 정책이 필요 없음.

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "인증된 유저만 쓰기 가능" ON public.notices;
DROP POLICY IF EXISTS "누구나 공지 읽기 가능"   ON public.notices;
DROP POLICY IF EXISTS notices_read              ON public.notices;

-- 게시된 공지만 누구나 읽기 (앱은 anon/authenticated로 조회)
CREATE POLICY notices_read ON public.notices
  FOR SELECT TO anon, authenticated
  USING (COALESCE(is_published, true));

-- INSERT/UPDATE/DELETE 정책은 만들지 않는다 → anon/authenticated 키로는 쓰기 불가


-- ═══════════════════════════════════════════════════════════════════════════
-- 2단계. photo_transfers — 본인 파일만 접근  【High】
-- ═══════════════════════════════════════════════════════════════════════════
-- 문제: RLS가 없으면 다른 사람의 file_path로 createSignedUrl을 호출해
--       타인이 올린 사진/문서를 내려받을 수 있음.
-- ※ user_id 컬럼명이 다르면 아래 4곳을 실제 컬럼명으로 바꾸세요.

ALTER TABLE public.photo_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pt_select ON public.photo_transfers;
DROP POLICY IF EXISTS pt_insert ON public.photo_transfers;
DROP POLICY IF EXISTS pt_update ON public.photo_transfers;
DROP POLICY IF EXISTS pt_delete ON public.photo_transfers;

CREATE POLICY pt_select ON public.photo_transfers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY pt_insert ON public.photo_transfers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY pt_update ON public.photo_transfers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY pt_delete ON public.photo_transfers
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 3단계. suggestions — 본인 건의사항만  【High】
-- ═══════════════════════════════════════════════════════════════════════════
-- 문제: RLS가 없으면 전체 회원의 이메일·닉네임 명부가 anon 키로 조회 가능.
-- ※ suggestions에 user_id 컬럼이 없다면 3-b를 먼저 실행하세요.

-- (3-a) 정상 케이스 — user_id 컬럼이 있는 경우
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sg_insert     ON public.suggestions;
DROP POLICY IF EXISTS sg_select_own ON public.suggestions;

CREATE POLICY sg_insert ON public.suggestions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY sg_select_own ON public.suggestions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- (3-b) user_id 컬럼이 없다면 아래를 먼저 실행한 뒤 3-a를 다시 실행
-- ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
--
-- ※ user_id를 추가할 수 없는 상황이면, 최소한 SELECT를 완전히 차단하세요
--    (관리자 API는 service_role이므로 영향 없음):
-- ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS sg_select_own ON public.suggestions;
-- CREATE POLICY sg_insert_only ON public.suggestions
--   FOR INSERT TO authenticated WITH CHECK (true);
-- (SELECT 정책 없음 → 조회 불가)


-- ═══════════════════════════════════════════════════════════════════════════
-- 4단계. app_versions — 읽기 전용 공개  【Medium】
-- ═══════════════════════════════════════════════════════════════════════════
-- 앱이 시작 시 버전을 조회해야 하므로 읽기는 공개, 쓰기는 관리자 API만.

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS av_read ON public.app_versions;

CREATE POLICY av_read ON public.app_versions
  FOR SELECT TO anon, authenticated USING (true);

-- 쓰기 정책 없음 → service_role(관리자 API)만 upsert 가능


-- ═══════════════════════════════════════════════════════════════════════════
-- 5단계. user_snapshots — 본인 데이터만  【Critical / 이미 적용됐을 가능성 있음】
-- ═══════════════════════════════════════════════════════════════════════════
-- 이 정책이 없으면 다른 사람의 일정·예산·인사이력·연락처를 전부 읽고
-- 덮어쓸 수 있습니다. 0단계 진단에서 확인하고 없으면 반드시 적용하세요.

ALTER TABLE public.user_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_snapshots_own ON public.user_snapshots;

CREATE POLICY user_snapshots_own ON public.user_snapshots
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- 6단계. profiles — 본인 프로필만  【High】
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

-- 본인 프로필 수정 가능하되, grade(등급)는 스스로 못 바꾸게 해야 함.
-- 컬럼 단위 제한은 RLS로 불가하므로 트리거로 방어:
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_grade_self_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp AS $$
BEGIN
  -- service_role(관리자 API)은 통과, 일반 사용자는 grade 변경 차단
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND NEW.grade IS DISTINCT FROM OLD.grade THEN
    RAISE EXCEPTION '등급은 직접 변경할 수 없습니다.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_grade_self_change ON public.profiles;
CREATE TRIGGER trg_prevent_grade_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_grade_self_change();


-- ═══════════════════════════════════════════════════════════════════════════
-- 7단계. SECURITY DEFINER 함수 권한 회수  【High】
-- ═══════════════════════════════════════════════════════════════════════════
-- 문제: PostgreSQL은 함수에 기본적으로 PUBLIC EXECUTE 권한을 줍니다.
--       따라서 anon 키로 /rest/v1/rpc/get_email_by_shared_account 를 직접
--       호출해 서버 라우트를 우회하고 이메일을 열거할 수 있습니다.
--       (NEXT_PUBLIC_SUPABASE_ANON_KEY는 브라우저에 공개되어 있음)
-- 해결: search_path 고정 + service_role만 실행 허용.

ALTER FUNCTION public.get_email_by_shared_account(TEXT, TEXT)
  SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.get_email_by_shared_account(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_shared_account(TEXT, TEXT)
  TO service_role;

-- check_email_exists 도 동일하게 처리
ALTER FUNCTION public.check_email_exists(TEXT)
  SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.check_email_exists(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT)
  TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8단계. Storage 버킷 정책 — 본인 폴더만  【High】
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ 사전 확인 (Dashboard → Storage → photo-transfers → Settings):
--    1) "Public bucket" 이 반드시 OFF 여야 합니다.
--    2) FILE SIZE LIMIT 은 앱 최고 등급(VVIP) 한도 이상으로 설정 (예: 500MB)
--
-- ※ 아래 정책은 파일 경로가 "{user_id}/파일명" 형태일 때만 동작합니다.
--    현재 업로드 경로 규칙을 먼저 확인하세요:
--      SELECT file_path FROM public.photo_transfers LIMIT 5;
--    경로가 user_id로 시작하지 않으면 이 정책을 적용하면 업로드가 깨집니다.

-- DROP POLICY IF EXISTS photo_transfers_own_files ON storage.objects;
-- CREATE POLICY photo_transfers_own_files ON storage.objects
--   FOR ALL TO authenticated
--   USING      (bucket_id = 'photo-transfers'
--               AND (storage.foldername(name))[1] = auth.uid()::text)
--   WITH CHECK (bucket_id = 'photo-transfers'
--               AND (storage.foldername(name))[1] = auth.uid()::text);


-- ═══════════════════════════════════════════════════════════════════════════
-- 9단계. 적용 확인 — 0단계를 다시 실행해서 결과 비교
-- ═══════════════════════════════════════════════════════════════════════════

SELECT relname AS 테이블, relrowsecurity AS "RLS_활성화"
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relrowsecurity, relname;

SELECT tablename AS 테이블, policyname AS 정책명, cmd AS 명령, roles AS 대상역할
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
