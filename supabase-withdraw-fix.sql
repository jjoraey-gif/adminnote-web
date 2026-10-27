-- 회원탈퇴 실패 원인 점검 및 수정
--
-- 증상: 일부 회원이 탈퇴되지 않는다.
-- 원인 추정: auth.users를 참조하는 외래키 중 ON DELETE CASCADE가 없는 것이 있으면,
--           해당 테이블에 기록이 남아 있는 회원은 계정 삭제가 막힌다.

-- ───────────────────────────────────────────────────────────────
-- 1단계. 먼저 이것만 실행해서 원인을 확인하세요.
--        delete_rule이 'NO ACTION'인 줄이 범인입니다.
-- ───────────────────────────────────────────────────────────────

select
  tc.table_schema || '.' || tc.table_name as 테이블,
  kcu.column_name                          as 컬럼,
  tc.constraint_name                       as 제약조건,
  rc.delete_rule                           as 삭제규칙
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema   = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'auth'
  and ccu.table_name   = 'users'
order by rc.delete_rule desc, 테이블;


-- ───────────────────────────────────────────────────────────────
-- 2단계. suggestions 외래키를 CASCADE로 바꾼다.
--        (1단계에서 suggestions가 'NO ACTION'으로 나왔을 때 실행)
-- ───────────────────────────────────────────────────────────────

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name   = 'suggestions'
    and ccu.table_schema = 'auth'
    and ccu.table_name   = 'users'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.suggestions drop constraint %I', fk_name);
  end if;

  alter table public.suggestions
    add constraint suggestions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
end $$;


-- ───────────────────────────────────────────────────────────────
-- 3단계. 1단계 결과에 suggestions 말고도 'NO ACTION'이 더 있으면,
--        아래 틀에 테이블명만 바꿔 같은 방식으로 고치세요.
-- ───────────────────────────────────────────────────────────────

-- alter table public.테이블명 drop constraint 제약조건이름;
-- alter table public.테이블명
--   add constraint 테이블명_user_id_fkey
--   foreign key (user_id) references auth.users(id) on delete cascade;
