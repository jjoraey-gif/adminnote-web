import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, grade } = await request.json();
  if (!userId || !['normal', 'vip', 'vvip'].includes(grade))
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminSupabase
    .from('profiles')
    .upsert({ id: userId, grade }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
