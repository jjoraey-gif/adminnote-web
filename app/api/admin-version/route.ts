import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

const PLATFORMS = ['ios', 'android'];
const SEMVER = /^\d+\.\d+\.\d+$/;

export async function POST(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, min_version, force_update, message, store_url } = await request.json();

  if (!PLATFORMS.includes(platform))
    return NextResponse.json({ error: 'platform은 ios 또는 android여야 합니다' }, { status: 400 });
  if (typeof min_version !== 'string' || !SEMVER.test(min_version))
    return NextResponse.json({ error: '버전은 x.y.z 형식이어야 합니다' }, { status: 400 });
  if (typeof force_update !== 'boolean')
    return NextResponse.json({ error: 'force_update must be boolean' }, { status: 400 });
  if (message != null && (typeof message !== 'string' || message.length > 300))
    return NextResponse.json({ error: 'message는 300자 이하 문자열' }, { status: 400 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminSupabase
    .from('app_versions')
    .upsert(
      {
        platform,
        version: min_version,
        force_update,
        message: message ?? '',
        ...(store_url ? { store_url } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'platform' },
    );

  if (error) { console.error('[admin-version POST]', error); return NextResponse.json({ error: '저장 실패' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
