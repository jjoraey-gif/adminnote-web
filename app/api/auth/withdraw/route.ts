import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 정보가 없습니다.' }, { status: 401 });
    }
    const accessToken = authHeader.replace('Bearer ', '');

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

    // 1. Storage 파일 삭제 (photo-transfers)
    const { data: files } = await adminSupabase.storage
      .from('photo-transfers')
      .list(userId, { limit: 1000 });

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`);
      await adminSupabase.storage.from('photo-transfers').remove(filePaths);
    }

    // 2. photo_transfers 레코드 삭제
    await adminSupabase.from('photo_transfers').delete().eq('user_id', userId);

    // 3. user_snapshots 삭제
    await adminSupabase.from('user_snapshots').delete().eq('user_id', userId);

    // 4. profiles 삭제
    await adminSupabase.from('profiles').delete().eq('id', userId);

    // 5. auth.users 삭제
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[withdraw] auth 삭제 실패:', deleteError);
      return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[withdraw] 오류:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
