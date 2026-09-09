-- 비밀번호 초기화 요청
--
-- 사용자가 로그인 화면에서 "비밀번호 초기화 요청하기"를 누르면 이 표에 한 줄 쌓인다.
-- 관리자가 /jjoraey 관리자 페이지에서 목록을 보고, 기존 "비밀번호 초기화" 기능으로
-- 임시 비밀번호를 발급해 해당 이메일로 직접 전달한다.
--
-- ※ Supabase 내장 메일은 프로젝트 전체 시간당 2통 제한이 있어 자동 발송 대신
--   관리자 수동 처리 방식으로 운영한다.

create table if not exists password_reset_requests (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  status      text not null default 'pending',   -- 'pending' | 'done'
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);

-- 미처리 요청을 최신순으로 빠르게 조회
create index if not exists password_reset_requests_status_created_idx
  on password_reset_requests (status, created_at desc);

-- 같은 이메일의 중복 요청을 확인할 때 사용
create index if not exists password_reset_requests_email_idx
  on password_reset_requests (email);

-- RLS 활성화 + 정책 없음 → 서비스 롤(서버 API)만 접근 가능.
-- 클라이언트가 anon 키로 직접 읽거나 쓰는 것을 차단한다.
-- (요청 접수는 /api/auth/reset-request, 조회·처리는 관리자 API에서만 이뤄진다)
alter table password_reset_requests enable row level security;
