import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'an_admin_auth';
const SECRET = process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkAuth(request: NextRequest): Promise<boolean> {
  const headerToken = request.headers.get('X-Admin-Token');
  if (headerToken === SECRET) return true;
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SECRET;
}

export async function POST(request: NextRequest) {
  if (!await checkAuth(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, min_version, force_update, message } = await request.json();
  if (!platform || !min_version)
    return NextResponse.json({ error: 'platform, min_version required' }, { status: 400 });

  const { error } = await adminSupabase
    .from('app_versions')
    .upsert(
      { platform, min_version, force_update, message, updated_at: new Date().toISOString() },
      { onConflict: 'platform' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
