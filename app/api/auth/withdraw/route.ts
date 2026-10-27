import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * 회원 탈퇴
 *
 * auth.users를 지우기 전에 이 회원의 데이터를 먼저 모두 지운다.
 * 참조하는 테이블에 기록이 남아 있으면 외래키 제약 때문에 계정 삭제가 실패하는데,
 * 실제로 건의사항을 남긴 회원이 탈퇴되지 않는 문제가 있었다.
 * (suggestions 외래키에 ON DELETE CASCADE가 없었다)
 *
 * 제약 설정에 기대지 않고 여기서 직접 정리해 두면, 스키마가 어떻게 되어 있든 탈퇴가 끝난다.
 */

/** user_id로 이 회원의 행을 지울 테이블 */
const USER_TABLES = [
  'photo_transfers',
  'user_snapshots',
  'usage_counters',
  'suggestions',
] as const;

/** 스토리지에서 이 회원 폴더를 통째로 비운다 (1000건씩 끊어서) */
async function purgeStorage(supabase: SupabaseClient, userId: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const { data: files, error } = await supabase.storage
      .from('photo-transfers')
      .list(userId, { limit: 1000 });

    if (error || !files || files.length === 0) return;

    await supabase.storage
      .from('photo-transfers')
      .remove(files.map(f => `${userId}/${f.name}`));

    if (files.length < 1000) return;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    // 일부 네트워크 환경(사내/기관 프록시 등)에서 커스텀 Authorization 헤더가
    // 중간에 걸러지는 경우가 있어, 헤더가 없으면 요청 본문의 토큰을 폴백으로 사용한다.
    let accessToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

    if (!accessToken) {
      try {
        const body = await request.json();
        if (typeof body?.accessToken === 'string') accessToken = body.accessToken;
      } catch {
        // 본문이 없거나 JSON이 아니면 무시 — 아래에서 401 처리
      }
    }

    if (!accessToken) {
      console.error('[withdraw] Authorization 헤더/본문에 토큰 없음. authHeader 존재 여부:', !!authHeader);
      return NextResponse.json({ error: '인증 정보가 없습니다.' }, { status: 401 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 토큰으로 사용자 확인
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const userId = user.id;
    const email = user.email;

    // 1. 스토리지 파일 삭제
    await purgeStorage(adminSupabase, userId);

    // 2. user_id로 연결된 데이터 삭제
    //    한 곳이 실패해도 나머지는 계속 지우고, 실패한 테이블만 기록해둔다.
    const failed: string[] = [];
    for (const table of USER_TABLES) {
      const { error } = await adminSupabase.from(table).delete().eq('user_id', userId);
      // 테이블이 없을 수도 있다(42P01) — 그 경우는 지울 것도 없으므로 넘어간다
      if (error && error.code !== '42P01') {
        console.error(`[withdraw] ${table} 삭제 실패:`, error.message);
        failed.push(table);
      }
    }

    // 3. 이메일로 연결된 데이터 삭제
    if (email) {
      const { error } = await adminSupabase
        .from('password_reset_requests').delete().eq('email', email);
      if (error && error.code !== '42P01') {
        console.error('[withdraw] password_reset_requests 삭제 실패:', error.message);
      }
    }

    // 4. profiles 삭제
    await adminSupabase.from('profiles').delete().eq('id', userId);

    // 5. 계정 삭제
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      // 원인을 알 수 있어야 고칠 수 있다. 어느 테이블이 걸렸는지까지 로그에 남긴다.
      console.error('[withdraw] auth 삭제 실패:', deleteError.message, '선행 삭제 실패 테이블:', failed);
      return NextResponse.json(
        { error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', detail: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[withdraw] 오류:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
