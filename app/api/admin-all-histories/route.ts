import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('an_admin_auth')?.value;
  if (token !== (process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: snapshots }, { data: profiles }] = await Promise.all([
    adminSupabase.from('user_snapshots').select('user_id, data, updated_at'),
    adminSupabase.from('profiles').select('id, email, nickname'),
  ]);

  const profileMap: Record<string, { email: string; nickname: string }> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  const rows = (snapshots ?? []).map((s: any) => {
    const d = s.data ?? {};
    const prof = profileMap[s.user_id] ?? {};
    const assignments: any[] = d.assignments ?? [];
    const promotions: any[] = d.promotions ?? [];
    const awards: any[] = d.awards ?? [];
    const careerInfo = d.careerInfo ?? null;

    // 최근 발령 부서
    const latestAssignment = [...assignments].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
    // 최근 직급
    const latestPromotion = [...promotions].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];

    return {
      userId: s.user_id,
      email: prof.email ?? '-',
      nickname: prof.nickname ?? '-',
      currentDept: latestAssignment?.department ?? '-',
      currentGrade: latestPromotion?.grade ?? '-',
      startDate: careerInfo?.startDate ?? null,
      promotionCount: promotions.length,
      assignmentCount: assignments.length,
      awardCount: awards.length,
      updatedAt: s.updated_at,
      // 전체 발령 목록 (부서 확인용)
      assignments: assignments.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    };
  });

  // 데이터 있는 사람만
  return NextResponse.json({ rows: rows.filter(r => r.assignmentCount > 0 || r.promotionCount > 0 || r.awardCount > 0) });
}
