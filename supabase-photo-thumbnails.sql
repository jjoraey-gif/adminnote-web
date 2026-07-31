-- 사진전송 썸네일 지원
--
-- 배경: 무료 플랜에서는 Supabase Storage의 이미지 변환(transform)이 동작하지 않아
-- `transform: { width: 400 }` 같은 옵션이 조용히 무시되고 원본이 그대로 전송됐다.
-- 그래서 목록 화면의 작은 썸네일 자리에 수 MB짜리 원본이 내려오며 Egress를 크게 소모했다.
--
-- 해결: 업로드 시점에 작은 썸네일 파일을 따로 만들어 저장하고, 목록에서는 그 파일만 읽는다.
-- thumb_path 는 이미지가 아닌 파일(문서 등)이나 구버전 업로드에서는 NULL 이며,
-- 이 경우 화면은 기존처럼 file_path 로 폴백한다.

alter table public.photo_transfers
  add column if not exists thumb_path text;

comment on column public.photo_transfers.thumb_path is
  '목록 표시용 축소 이미지 경로. 이미지가 아니거나 구버전 업로드면 NULL (이때 file_path로 폴백).';
