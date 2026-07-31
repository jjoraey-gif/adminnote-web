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
const BATCH_SIZE = 15;

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
      const thumbBuffer = await sharp(originalBuffer)
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
