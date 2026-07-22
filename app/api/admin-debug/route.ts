import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAdminId: !!process.env.ADMIN_ID,
    hasAdminPw: !!process.env.ADMIN_PW,
    hasSecret: !!process.env.ADMIN_SESSION_SECRET,
    adminIdLength: process.env.ADMIN_ID?.length ?? 0,
    adminPwLength: process.env.ADMIN_PW?.length ?? 0,
    adminIdPreview: process.env.ADMIN_ID
      ? process.env.ADMIN_ID.slice(0, 3) + '***' + process.env.ADMIN_ID.slice(-4)
      : 'NOT SET',
    adminPwPreview: process.env.ADMIN_PW
      ? process.env.ADMIN_PW.slice(0, 3) + '***'
      : 'NOT SET',
  });
}
