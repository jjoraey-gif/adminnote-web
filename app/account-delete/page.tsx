import Link from 'next/link';

export default function AccountDeletePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">계정 삭제 안내</h1>
        <p className="text-sm text-gray-400 mb-10">AdminNote 계정 및 데이터 삭제 방법</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          <section className="bg-blue-50 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">앱에서 계정 삭제하기</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>AdminNote 앱을 실행합니다.</li>
              <li>하단 탭에서 <strong>더보기</strong>를 탭합니다.</li>
              <li><strong>마이페이지</strong>를 탭합니다.</li>
              <li>하단의 <strong>회원탈퇴</strong>를 탭합니다.</li>
              <li>안내에 따라 탈퇴를 완료합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">삭제되는 데이터</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>계정 정보 (이메일, 닉네임, 기관명 등)</li>
              <li>저장된 일정, 할 일, 메모 등 모든 개인 데이터</li>
              <li>전송된 사진 및 파일</li>
            </ul>
            <p className="mt-3 text-sm text-gray-500">계정 삭제 후 데이터는 복구되지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">문의</h2>
            <p className="text-sm text-gray-600">
              탈퇴에 어려움이 있으시면 아래 이메일로 문의해 주세요.
            </p>
            <a href="mailto:jjoraey@gmail.com" className="inline-block mt-2 text-blue-600 font-medium text-sm hover:underline">
              jjoraey@gmail.com
            </a>
          </section>

        </div>
      </div>
    </div>
  );
}
