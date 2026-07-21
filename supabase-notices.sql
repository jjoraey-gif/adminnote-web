-- AdminNote 공지사항 테이블
-- Supabase Dashboard → SQL Editor에서 실행

create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('업데이트', '이용안내')),
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 앱(익명 포함)에서 읽기 허용
alter table public.notices enable row level security;

create policy "누구나 공지 읽기 가능" on public.notices
  for select using (true);

create policy "인증된 유저만 쓰기 가능" on public.notices
  for all using (auth.role() = 'authenticated');

-- 테스트 데이터
insert into public.notices (category, title, content)
values ('이용안내', '테스트', '공지사항 테스트입니다.');
