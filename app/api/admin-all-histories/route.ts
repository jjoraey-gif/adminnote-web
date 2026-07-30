import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function GET() {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: snapshots }, { data: profiles }, { data: authData }] = await Promise.all([
    adminSupabase.from('user_snapshots').select('user_id, data, updated_at'),
    adminSupabase.from('profiles').select('id, email, nickname'),
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // auth.users 이메일 맵
  const authEmailMap: Record<string, string> = {};
  (authData?.users ?? []).forEach((u: any) => { if (u.email) authEmailMap[u.id] = u.email; });

  // profiles 맵 (email은 auth 우선)
  const profileMap: Record<string, { email: string; nickname: string }> = {};
  (profiles ?? []).forEach((p: any) => {
    profileMap[p.id] = {
      email: authEmailMap[p.id] ?? p.email ?? '-',
      nickname: p.nickname ?? '-',
    };
  });
  // profiles에 없는 유저도 auth email로 보완
  (authData?.users ?? []).forEach((u: any) => {
    if (!profileMap[u.id]) {
      profileMap[u.id] = { email: u.email ?? '-', nickname: '-' };
    }
  });

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
