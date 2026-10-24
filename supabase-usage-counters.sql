-- 기능별 누적 이용 집계
--
-- 사진전송 기록(photo_transfers)은 보관기간이 지나면 삭제되기 때문에,
-- 그대로 두면 "최근 3일 이용자"밖에 알 수 없다.
-- 정리 작업이 레코드를 지우기 직전에 이 표에 건수만 더해두면,
-- 사진 자체는 지우면서도 누적 이용 통계는 남길 수 있다.
--
-- 개별 파일 정보(파일명·경로)는 저장하지 않는다. 숫자만 남긴다.

create table if not exists public.usage_counters (
  user_id      uuid        not null,
  feature      text        not null,   -- 'photo_transfer' | 'silent_camera'
  count        bigint      not null default 0,
  bytes        bigint      not null default 0,
  last_used_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, feature)
);

comment on table public.usage_counters is '기능별 누적 이용 건수 (개별 내용 없이 숫자만 보관)';

-- 조회는 관리자(service_role)만 한다. 일반 사용자는 접근할 일이 없다.
alter table public.usage_counters enable row level security;

-- 집계를 원자적으로 더하는 함수
-- (여러 건을 한 번에 넘겨 upsert 경합 없이 누적시킨다)
create or replace function public.bump_usage_counter(
  p_user_id uuid,
  p_feature text,
  p_count   bigint,
  p_bytes   bigint,
  p_last_used_at timestamptz
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage_counters (user_id, feature, count, bytes, last_used_at, updated_at)
  values (p_user_id, p_feature, p_count, p_bytes, p_last_used_at, now())
  on conflict (user_id, feature) do update
    set count        = public.usage_counters.count + excluded.count,
        bytes        = public.usage_counters.bytes + excluded.bytes,
        last_used_at = greatest(
                         coalesce(public.usage_counters.last_used_at, excluded.last_used_at),
                         coalesce(excluded.last_used_at, public.usage_counters.last_used_at)
                       ),
        updated_at   = now();
$$;

revoke all on function public.bump_usage_counter(uuid, text, bigint, bigint, timestamptz) from public, anon, authenticated;

-- 무음카메라 구분용 컬럼
-- 앱이 사진을 올릴 때 어느 경로로 올렸는지 표시한다. 값이 없으면 직접 업로드로 본다.
alter table public.photo_transfers
  add column if not exists source text;

comment on column public.photo_transfers.source is '업로드 경로: silent_camera | null(직접 업로드)';
