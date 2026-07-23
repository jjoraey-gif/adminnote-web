import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  let listUsersOk = false;
  let userCount = 0;
  let profileCount = 0;
  let listError = '';
  let profileError = '';

  if (hasServiceKey && hasUrl) {
    try {
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data, error } = await adminSupabase.auth.admin.listUsers({ perPage: 10 });
      if (error) {
        listError = error.message;
      } else {
        listUsersOk = true;
        userCount = data?.users?.length ?? 0;
      }

      const { data: profiles, error: pErr } = await adminSupabase.from('profiles').select('id', { count: 'exact', head: true });
      if (pErr) {
        profileError = pErr.message;
      } else {
        profileCount = (profiles as any) ?? 0;
      }
    } catch (e: any) {
      listError = e?.message ?? 'unknown error';
    }
  }

  return NextResponse.json({
    hasServiceKey,
    hasUrl,
    serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...',
    listUsersOk,
    userCount,
    profileCount,
    listError: listError || null,
    profileError: profileError || null,
  });
}
