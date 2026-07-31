import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const VID_COOKIE = 'an_vid';

// KST(UTC+9) 기준 오늘 날짜 문자열 (YYYY-MM-DD)
function kstDateStr(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 홈페이지 방문 기록 — 익명 방문자 카운터.
 * 쿠키(an_vid)로 방문자를 구분하고, (visitor_id, visit_date) unique 제약 덕분에
 * 같은 방문자가 같은 날 여러 번 호출해도 한 번만 집계된다.
 * 실패해도 사용자 경험에 영향이 없어야 하므로 항상 200을 반환한다.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let vid = request.cookies.get(VID_COOKIE)?.value;
  const isNew = !vid;
  if (!vid) vid = randomUUID();

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from('site_visits').upsert(
        { visitor_id: vid, visit_date: kstDateStr() },
        { onConflict: 'visitor_id,visit_date', ignoreDuplicates: true },
      );
    } catch {
      // 집계 실패는 무시 — 방문 자체를 막으면 안 됨
    }
  }

  const res = NextResponse.json({ ok: true });
  if (isNew) {
    res.cookies.set(VID_COOKIE, vid, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 * 5, // 5년
      path: '/',
    });
  }
  return res;
}
