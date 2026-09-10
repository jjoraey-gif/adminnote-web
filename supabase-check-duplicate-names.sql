-- 이미 가입된 회원 중 중복된 닉네임 / 기관이름 확인용 조회
--
-- 신규 가입은 서버(/api/auth/signup)에서 막지만, 이 기능이 생기기 전에 가입한
-- 계정들 사이에는 중복이 남아 있을 수 있다. 아래 쿼리로 확인한 뒤 필요하면
-- 관리자 페이지에서 정리하면 된다.
--
-- 비교 기준은 서버 로직과 동일하게 "앞뒤 공백 제거 + 대소문자 무시"다.

-- 1) 중복된 닉네임 (개인회원)
select lower(trim(nickname)) as 닉네임,
       count(*)             as 계정수,
       array_agg(id)        as 계정_id목록
from profiles
where nickname is not null
  and trim(nickname) <> ''
group by lower(trim(nickname))
having count(*) > 1
order by count(*) desc;

-- 2) 중복된 기관이름 (공용폰)
select lower(trim(org_name)) as 기관이름,
       count(*)              as 계정수,
       array_agg(user_id)    as 아이디목록,
       array_agg(id)         as 계정_id목록
from profiles
where org_name is not null
  and trim(org_name) <> ''
group by lower(trim(org_name))
having count(*) > 1
order by count(*) desc;

-- 3) (선택) 중복을 모두 정리한 뒤라면, DB 차원에서도 못 들어오게 막을 수 있다.
--    ※ 위 1·2번 조회 결과가 0건일 때만 실행할 것. 중복이 남아 있으면 생성에 실패한다.
--
-- create unique index if not exists profiles_nickname_unique_idx
--   on profiles (lower(trim(nickname)))
--   where nickname is not null and trim(nickname) <> '';
--
-- create unique index if not exists profiles_org_name_unique_idx
--   on profiles (lower(trim(org_name)))
--   where org_name is not null and trim(org_name) <> '';
