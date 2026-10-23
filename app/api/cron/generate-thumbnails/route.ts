import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { safeEqual } from '@/lib/admin-auth';

// 앱에서 업로드된 사진은 썸네일(thumb_path)이 없어 목록에서 원본(최대 1280px)을
// 그대로 내려받는다. 앱을 재빌드하지 않고도 이를 해결하기 위해, 주기적으로
// thumb_path가 없는 사진을 찾아 서버에서 축소 이미지를 생성해 채워준다.
// (web/components/PhotoTransferView.tsx의 클라이언트 썸네일 생성과 동일한 스펙: 320px / JPEG 70%)

const BUCKET = 'photo-transfers';
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp'];
const THUMB_MAX = 320;
// 한 번 실행에 처리할 최대 건수 — 서버리스 함수 실행 시간 제한을 넘지 않도록 배치 처리
// (Vercel Hobby 플랜은 크론을 하루 1회로만 제한하므로, 적체된 사진을 더 빨리 처리하도록
//  10분 간격일 때보다 배치 크기를 늘렸다)
const BATCH_SIZE = 40;

/**
 * 썸네일을 만들 실제 이미지 형식
 *
 * 파일 확장자는 업로더가 정하는 값이라 신뢰할 수 없다(악성 SVG를 evil.jpg로 올릴 수 있다).
 * 그래서 내용을 읽어 판별한 실제 형식이 이 목록에 있을 때만 변환한다.
 * SVG는 렌더링 과정에서 외부 자원을 참조할 수 있어 제외한다.
 */
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'heif', 'gif', 'tiff'];

/** 디코딩을 허용할 최대 픽셀 수 — 작은 파일이 거대한 이미지로 풀리는 공격을 막는다 */
const MAX_INPUT_PIXELS = 50_000_000; // 약 5천만 픽셀

function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.includes(ext);
}

/** file_path("userId/base.ext")에서 썸네일 경로("userId/base_thumb.jpg")를 유도한다. */
function deriveThumbPath(filePath: string): string | null {
  const idx = filePath.lastIndexOf('.');
  if (idx === -1) return null;
  return `${filePath.slice(0, idx)}_thumb.jpg`;
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[generate-thumbnails] CRON_SECRET 환경변수 미설정');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const nowIso = new Date().toISOString();

  // 썸네일이 없고, 삭제되지 않았고, 만료되지 않은 사진 중 오래된 것부터 처리
  const { data: rows, error } = await adminSupabase
    .from('photo_transfers')
    .select('id, file_path, file_name')
    .is('thumb_path', null)
    .is('deleted_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('[generate-thumbnails] DB 조회 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, message: '처리할 항목 없음' });
  }

  let succeeded = 0;
  let skipped = 0;
  const failures: { id: string; reason: string }[] = [];

  for (const row of rows) {
    if (!isImageFile(row.file_name)) {
      skipped++;
      continue;
    }

    const thumbPath = deriveThumbPath(row.file_path);
    if (!thumbPath) {
      skipped++;
      continue;
    }

    try {
      const { data: fileBlob, error: downloadErr } = await adminSupabase.storage
        .from(BUCKET)
        .download(row.file_path);

      if (downloadErr || !fileBlob) {
        throw new Error(downloadErr?.message ?? '원본 다운로드 실패');
      }

      const originalBuffer = Buffer.from(await fileBlob.arrayBuffer());

      // 파일 내용으로 실제 형식을 먼저 확인한다 — 확장자만 믿고 디코딩하지 않는다
      const image = sharp(originalBuffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
      const meta = await image.metadata();
      if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
        skipped++;
        continue;
      }

      const thumbBuffer = await image
        .resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      const { error: uploadErr } = await adminSupabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumbBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { error: updateErr } = await adminSupabase
        .from('photo_transfers')
        .update({ thumb_path: thumbPath })
        .eq('id', row.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      succeeded++;
    } catch (e) {
      failures.push({ id: row.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  if (failures.length > 0) {
    console.error('[generate-thumbnails] 실패 항목:', failures);
  }
  console.log(`[generate-thumbnails] 처리 ${rows.length}건 — 성공 ${succeeded}, 건너뜀 ${skipped}, 실패 ${failures.length}`);

  return NextResponse.json({ processed: rows.length, succeeded, skipped, failed: failures.length });
}
