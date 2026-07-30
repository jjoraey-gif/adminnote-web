import { NextResponse } from 'next/server';

// 보안상 제거된 엔드포인트입니다.
// 이전 버전은 인증 없이 SUPABASE_SERVICE_ROLE_KEY 접두어와 회원 수를 노출했습니다.
// 이 디렉토리는 완전히 삭제하는 것이 권장됩니다:
//   rm -rf web/app/api/admin-debug
export async function GET() {
  return new NextResponse('Not Found', { status: 404 });
}
