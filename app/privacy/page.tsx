import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold">
            <span className="text-blue-600">Admin</span>
            <span className="text-gray-900">Note</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보 처리방침</h1>
        <p className="text-sm text-gray-400 mb-10">최종 수정일: 2026년 7월 28일</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-6">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">앱 및 개발자 정보</h2>
            <p>
              본 개인정보처리방침은 <strong>공무원 업무수첩 (AdminNote)</strong> 앱(이하 &ldquo;앱&rdquo;)에 적용됩니다.
              개발자: <strong>김창현</strong> (개인 개발자)
              <br />
              문의 이메일: <a href="mailto:jjoraey@gmail.com" className="text-blue-600">jjoraey@gmail.com</a>
              <br />
              Google Play 스토어 등록명: <strong>공무원 업무수첩</strong>
              <br />
              App Store 등록명: <strong>공무원 업무수첩</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. 수집하는 개인정보</h2>
            <p>공무원 업무수첩(AdminNote)은 서비스 제공을 위해 다음 정보를 수집합니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>이메일 주소 (소셜 로그인 또는 직접 입력)</li>
              <li>이름 또는 닉네임</li>
              <li>소셜 로그인 식별자 (Google, Apple, Kakao)</li>
              <li>앱 사용 중 입력한 업무일정, 할 일 목록, 예산 등 서비스 데이터</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. 수집 목적</h2>
            <p>수집된 정보는 다음 목적에만 사용됩니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>계정 생성 및 관리</li>
              <li>서비스(업무일정, 할 일, 예산관리 등) 제공 및 기기 간 동기화</li>
              <li>공지사항 전달</li>
              <li>앱 업데이트 안내</li>
            </ul>
            <p className="mt-2">수집된 정보는 제3자에게 제공하거나 판매하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. 보관 기간</h2>
            <p>
              회원 탈퇴 시 수집된 개인정보를 즉시 파기합니다.
              단, 관련 법령(전자상거래법, 통신비밀보호법 등)에 따라 일정 기간 보관이 필요한 경우는 해당 법령에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. 제3자 서비스</h2>
            <p>앱은 다음 제3자 서비스를 사용합니다. 각 서비스의 개인정보처리방침을 확인하세요.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Supabase (데이터 저장 및 인증): <a href="https://supabase.com/privacy" className="text-blue-600" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a></li>
              <li>Google Sign-In: <a href="https://policies.google.com/privacy" className="text-blue-600" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
              <li>Apple Sign-In: <a href="https://www.apple.com/legal/privacy/" className="text-blue-600" target="_blank" rel="noopener noreferrer">https://www.apple.com/legal/privacy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. 이용자 권리</h2>
            <p>
              이용자는 언제든지 개인정보 조회, 수정, 삭제를 요청할 수 있습니다.
              계정 삭제는 앱 내 설정 또는 아래 이메일로 요청할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. 아동 개인정보 보호</h2>
            <p>본 앱은 만 14세 미만 아동을 대상으로 하지 않으며, 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">문의</h2>
            <p>
              개발자: 김창현<br />
              이메일: <a href="mailto:jjoraey@gmail.com" className="text-blue-600">jjoraey@gmail.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
