-- 홈페이지 방문자 카운터
-- 관리자 페이지 상단에 "총 방문자 / 오늘 방문자"를 표시하기 위한 테이블.
-- 쿠키(an_vid)로 방문자를 구분하고, (visitor_id, visit_date) unique 제약으로
-- 같은 방문자가 같은 날 여러 번 접속해도 한 번만 집계된다.

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  visit_date date not null,
  created_at timestamptz not null default now(),
  unique (visitor_id, visit_date)
);

create index if not exists site_visits_date_idx on public.site_visits (visit_date);

-- RLS 활성화 + 정책 없음 = anon/authenticated 클라이언트는 접근 불가.
-- 기록(insert)과 집계 조회(select)는 모두 서버의 서비스 롤 키를 통해서만 수행된다
-- (web/app/api/track-visit/route.ts, web/app/jjoraey/page.tsx).
alter table public.site_visits enable row level security;
