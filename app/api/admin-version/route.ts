import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'an_admin_session';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const isAuthed = token === (process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok');
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, min_version, force_update, message } = await request.json();
  if (!platform || !min_version) {
    return NextResponse.json({ error: 'platform, min_version required' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('app_versions')
    .upsert(
      { platform, min_version, force_update, message, updated_at: new Date().toISOString() },
      { onConflict: 'platform' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
