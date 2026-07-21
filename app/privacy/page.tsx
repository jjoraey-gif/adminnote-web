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
        <p className="text-sm text-gray-400 mb-10">최종 수정일: 2026년 7월 21일</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. 수집하는 개인정보</h2>
            <p>AdminNote는 서비스 제공을 위해 이메일 주소, 이름(닉네임), 소셜 로그인 식별자를 수집합니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. 수집 목적</h2>
            <p>수집된 정보는 계정 관리, 서비스 제공, 공지사항 전달에만 사용됩니다. 제3자에게 제공하지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. 보관 기간</h2>
            <p>회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우는 예외입니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. 이용자 권리</h2>
            <p>이용자는 언제든지 개인정보 조회, 수정, 삭제를 요청할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">문의</h2>
            <p>개인정보 관련 문의: <a href="mailto:jjoraey@gmail.com" className="text-blue-600">jjoraey@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
