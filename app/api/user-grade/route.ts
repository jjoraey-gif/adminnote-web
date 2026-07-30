import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * 본인의 등급만 조회. Authorization: Bearer <access_token> 필수.
 * (이전 버전은 인증 없이 임의 userId의 등급을 조회할 수 있는 IDOR 취약점이 있었음)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 토큰 검증 — 본인 확인
    const { data: userData, error: authError } = await adminSupabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 본인 id로만 조회
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('grade')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ grade: 'normal' });
    return NextResponse.json({ grade: data.grade ?? 'normal' });
  } catch {
    return NextResponse.json({ grade: 'normal' });
  }
}
