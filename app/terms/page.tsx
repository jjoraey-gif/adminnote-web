import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">서비스 이용약관</h1>
        <p className="text-sm text-gray-400 mb-10">최종 수정일: 2026년 7월 21일</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제1조 (목적)</h2>
            <p>이 약관은 AdminNote(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제2조 (서비스 이용)</h2>
            <p>서비스는 공무원 업무 관리를 위해 제공되며, 개인적인 용도로만 사용 가능합니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제3조 (면책)</h2>
            <p>서비스 제공자는 이용자의 귀책사유로 발생한 손해에 대해 책임을 지지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">문의</h2>
            <p>이용약관 관련 문의: <a href="mailto:jjoraey@gmail.com" className="text-blue-600">jjoraey@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
