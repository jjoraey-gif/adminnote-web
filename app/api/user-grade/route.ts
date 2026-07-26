import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ grade: 'normal' });

    // 서비스 롤로 grade 읽기 (RLS 우회)
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('grade')
      .eq('id', userId)
      .single();

    if (error || !data) return NextResponse.json({ grade: 'normal' });

    return NextResponse.json({ grade: data.grade ?? 'normal' });
  } catch {
    return NextResponse.json({ grade: 'normal' });
  }
}
