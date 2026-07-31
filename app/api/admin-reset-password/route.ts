import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAdminAuthed } from '@/lib/admin-auth';

// 검색 결과 최대 건수 — 화면이 무한정 길어지는 것을 방지
const MAX_RESULTS = 20;

function generateTempPassword(): string {
  // 임시 비밀번호: 영문/숫자 조합 10자 (base64에서 특수문자만 제거)
  return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
}

/**
 * 이메일 / 닉네임 / 기관명 / 공용폰 아이디로 회원을 검색한다.
 * GET /api/admin-reset-password?q=검색어
 */
export async function GET(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';
  if (!q) return NextResponse.json({ users: [] });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: authData, error: authErr }, { data: profiles }] = await Promise.all([
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
    adminSupabase.from('profiles').select('id, account_type, nickname, org_name, user_id'),
  ]);

  if (authErr) {
    console.error('[admin-reset-password] listUsers 실패:', authErr);
    return NextResponse.json({ error: '회원 목록을 불러올 수 없습니다.' }, { status: 500 });
  }

  const profileMap: Record<string, { account_type: string; nickname: string | null; org_name: string | null; user_id: string | null }> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  const matches = (authData?.users ?? [])
    .filter((u: any) => {
      const prof = profileMap[u.id];
      const haystack = [u.email, prof?.nickname, prof?.org_name, prof?.user_id]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, MAX_RESULTS)
    .map((u: any) => {
      const prof = profileMap[u.id];
      return {
        id: u.id,
        email: u.email ?? '-',
        nickname: prof?.nickname ?? null,
        accountType: prof?.account_type ?? 'personal',
        orgName: prof?.org_name ?? null,
        userId: prof?.user_id ?? null,
      };
    });

  return NextResponse.json({ users: matches });
}

/**
 * 임시 비밀번호를 생성해 해당 계정에 즉시 적용한다.
 * POST /api/admin-reset-password { userId }
 */
export async function POST(request: NextRequest) {
  if (!await isAdminAuthed())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await request.json();
  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const newPassword = generateTempPassword();

  const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    console.error('[admin-reset-password] 비밀번호 초기화 실패:', error);
    return NextResponse.json({ error: '비밀번호 초기화에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: data.user?.email ?? null, password: newPassword });
}
