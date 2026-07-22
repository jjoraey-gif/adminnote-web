import { NextResponse } from 'next/server';

const TOKEN = 'an_admin_auth';

export async function POST(request: Request) {
  const { id, pw } = await request.json();

  if (id !== process.env.ADMIN_ID || pw !== process.env.ADMIN_PW) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(TOKEN, process.env.ADMIN_SESSION_SECRET ?? 'an_admin_ok', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8시간
    path: '/jjoraey',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('an_admin_auth');
  return res;
}
