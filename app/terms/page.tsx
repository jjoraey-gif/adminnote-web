import Link from 'next/link';
import ContactEmail from '@/components/ContactEmail';

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
        <p className="text-sm text-gray-400 mb-10">최종 수정일: 2026년 10월 14일</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-6">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제1조 (목적)</h2>
            <p>
              이 약관은 개인 개발자 김창현(이하 &ldquo;운영자&rdquo;)이 제공하는 모바일 애플리케이션
              <strong> 공무원 업무수첩(AdminNote)</strong> 및 웹사이트 adminnote.co.kr(이하 &ldquo;서비스&rdquo;)의
              이용 조건과 절차, 운영자와 이용자의 권리·의무를 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제2조 (약관의 효력 및 변경)</h2>
            <p>
              ① 이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.
              <br />
              ② 운영자는 필요한 경우 약관을 변경할 수 있으며, 변경 시 시행일과 변경 내용을 공지합니다.
              <br />
              ③ 이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제3조 (서비스의 내용)</h2>
            <p>운영자는 다음 기능을 제공합니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>업무일정, 오늘 할 일, 메모 관리</li>
              <li>예산 집행 현황 관리</li>
              <li>인사 이력 및 승진순위 관리, 부서 조직도, 외부 연락처</li>
              <li>업무사진관리, 문서스캔보관함, 무음카메라</li>
              <li>사진전송(기기에서 PC로 파일 전달)</li>
              <li>초과근무 기록알람, 이력 기념일 알림</li>
              <li>앱과 웹 간 데이터 동기화</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제4조 (이용 요금)</h2>
            <p>
              서비스는 <strong>전면 무료</strong>로 제공됩니다. 유료 기능, 인앱 결제, 광고는 없으며
              이용자의 데이터를 광고 목적으로 이용하거나 제3자에게 판매하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제5조 (계정)</h2>
            <p>
              ① 서비스 이용을 위해서는 계정 등록이 필요합니다.
              <br />
              ② 이용자는 계정 정보를 정확하게 입력하여야 하며, 계정 관리 책임은 이용자에게 있습니다.
              <br />
              ③ 공용 단말 계정은 기관 내 공동 이용을 전제로 하므로, 해당 계정에 저장된 정보는
              같은 계정을 사용하는 다른 이용자가 열람할 수 있습니다. 개인적인 정보는 저장하지 마시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제6조 (이용자의 의무)</h2>
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>대외비 문서, 비공개 행정자료, 보안상 보호가 필요한 자료를 사진전송 기능에 업로드하는 행위</strong>
              </li>
              <li>타인의 개인정보를 업무상 필요한 범위를 넘어 입력하거나 업로드하는 행위</li>
              <li>타인의 계정을 무단으로 사용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하거나 서버에 과도한 부하를 유발하는 행위</li>
              <li>관계 법령 및 소속 기관의 보안 규정을 위반하는 행위</li>
            </ul>
            <p className="mt-2">
              서비스는 공무원의 개인적인 업무 보조 수단이며, 공식 행정 기록 시스템을 대체하지 않습니다.
              공식 기록은 반드시 소속 기관의 정식 시스템에 보관하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제7조 (사진전송 기능의 제한)</h2>
            <p>
              ① 서버 자원 보호를 위해 등급별 1일 전송 용량 및 파일당 용량 제한이 적용됩니다.
              <br />
              ② 업로드한 파일은 <strong>보관기간 3일이 지나면 자동으로 삭제</strong>되며, 이 기능은
              파일의 장기 보관을 목적으로 하지 않습니다.
              <br />
              ③ 보관기간 경과로 삭제된 파일은 복구할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제8조 (데이터의 보관 및 백업)</h2>
            <p>
              ① 서비스는 이용자 데이터의 보존을 위해 노력하나, 중요한 자료는 이용자가 별도로 백업하여야 합니다.
              <br />
              ② 업무사진관리, 문서스캔보관함 등 기기에만 저장되는 자료는 기기 변경·분실, 앱 삭제 시 복구되지 않습니다.
              <br />
              ③ 회원 탈퇴 시 서버에 저장된 데이터는 삭제되며 복구할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제9조 (서비스의 변경 및 중단)</h2>
            <p>
              ① 운영자는 서비스의 내용을 변경하거나 일부 기능을 중단할 수 있으며, 이 경우 사전에 공지합니다.
              <br />
              ② 본 서비스는 개인이 무상으로 운영하는 서비스로서, 운영자의 사정에 따라 서비스 전체가
              종료될 수 있습니다. 이 경우 최소 30일 전에 공지하여 이용자가 데이터를 내려받을 수 있도록 합니다.
              <br />
              ③ 천재지변, 서버 장애, 제3자 서비스(클라우드 사업자 등)의 장애로 인한 일시적 중단은
              사전 공지 없이 이루어질 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제10조 (면책)</h2>
            <p>
              ① 운영자는 무상으로 제공되는 서비스와 관련하여 고의 또는 중대한 과실이 없는 한
              이용자에게 발생한 손해에 대하여 책임을 지지 않습니다.
              <br />
              ② 이용자가 서비스에 입력한 정보의 정확성에 대한 책임은 이용자에게 있으며,
              서비스가 제공하는 승진순위·호봉 등의 계산 결과는 참고용입니다. 공식적인 효력은
              소속 기관의 인사 시스템에 따릅니다.
              <br />
              ③ 이용자가 제6조를 위반하여 발생한 보안 사고 및 법적 책임은 이용자에게 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제11조 (개인정보의 보호)</h2>
            <p>
              이용자의 개인정보 처리에 관한 사항은 별도의{' '}
              <Link href="/privacy" className="text-blue-600">개인정보 처리방침</Link>에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">제12조 (준거법 및 분쟁 해결)</h2>
            <p>
              이 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련하여 분쟁이 발생한 경우
              운영자와 이용자는 성실히 협의하여 해결합니다. 협의가 이루어지지 않을 경우
              민사소송법상의 관할 법원에 소를 제기할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">문의</h2>
            <p>
              운영자: 김창현<br />
              이용약관 관련 문의: <ContactEmail />
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
