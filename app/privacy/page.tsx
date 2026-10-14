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
        <p className="text-sm text-gray-400 mb-10">최종 수정일: 2026년 10월 14일</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-6">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">앱 및 개발자 정보</h2>
            <p>
              본 개인정보처리방침은 <strong>공무원 업무수첩 (AdminNote)</strong> 앱 및
              웹사이트(adminnote.co.kr)(이하 &ldquo;서비스&rdquo;)에 적용됩니다.
              <br />
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

            <p className="font-semibold mt-3">가. 회원가입 시 수집하는 정보</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>개인회원: 이메일 주소, 비밀번호, 닉네임</li>
              <li>공용 단말 계정: 기관이름, 로그인 아이디, 인증용 이메일 주소, 비밀번호</li>
            </ul>
            <p className="mt-1 text-gray-600">
              주민등록번호, 생년월일, 실명, 휴대전화번호는 수집하지 않습니다.
            </p>

            <p className="font-semibold mt-4">나. 서비스 이용 과정에서 이용자가 직접 입력하는 정보</p>
            <p className="mt-1">
              아래 정보는 기기 간 동기화를 위해 서버에 저장됩니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>업무일정, 오늘 할 일, 메모</li>
              <li>예산 세부사업 및 집행 내역</li>
              <li>인사 이력: 승진·전보·수상 이력, 임용일, 호봉 및 승급일, 성과평가 등급·순위</li>
              <li>부서 조직도에 입력한 구성원 정보(이름, 직급, 전화번호)</li>
              <li>외부 연락처에 입력한 정보(기관명, 성명, 부서, 직위, 전화번호, 이메일)</li>
              <li>초과근무 기록알람 및 이력 기념일 알림 설정</li>
            </ul>

            <p className="font-semibold mt-4">다. 사진전송 기능 이용 시</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>이용자가 직접 선택하여 업로드한 사진 및 파일</li>
            </ul>

            <p className="font-semibold mt-4">라. 자동으로 수집되는 정보</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>앱 버전 및 기기 운영체제 정보 (업데이트 안내 목적)</li>
              <li>웹사이트 방문 통계용 익명 식별자 (개인을 식별하지 않습니다)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              2. 기기에만 저장되어 서버로 전송되지 않는 정보
            </h2>
            <p>
              아래 기능으로 저장한 자료는 <strong>이용자의 기기 안에만 보관</strong>되며 서버로 전송되지 않습니다.
              따라서 개발자를 포함한 누구도 접근할 수 없고, 기기를 변경하거나 앱을 삭제하면 복구되지 않습니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>업무사진관리에 저장한 사진</li>
              <li>문서스캔보관함에 저장한 문서</li>
              <li>무음카메라로 촬영한 사진(사진전송 자동 업로드를 켜지 않은 경우)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>계정 생성 및 본인 확인, 로그인 유지</li>
              <li>서비스 제공 및 앱·웹 간 데이터 동기화</li>
              <li>사진전송 기능을 통한 파일 전달</li>
              <li>공지사항 전달 및 앱 업데이트 안내</li>
              <li>문의·건의사항 처리</li>
              <li>서비스 장애 대응 및 부정 이용 방지</li>
            </ul>
            <p className="mt-2">
              수집된 정보는 위 목적 외로 사용하지 않으며, 제3자에게 제공하거나 판매하지 않습니다.
              광고 목적으로 이용하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. 보관 기간 및 파기</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>계정 정보 및 서비스 데이터</strong>: 회원 탈퇴 시 지체 없이 파기합니다.
              </li>
              <li>
                <strong>사진전송 기능으로 업로드한 파일</strong>: 업로드 후 <strong>3일</strong>이 지나면
                원본과 축소본이 자동으로 삭제됩니다. 이용자가 직접 삭제한 파일은 오삭제 복구 및 장애 대응을 위해
                3일간 보관한 뒤 영구 삭제합니다. 삭제 작업은 매일 1회 일괄 수행되므로 최대 24시간의 차이가 있을 수 있습니다.
              </li>
              <li>
                관련 법령에 따라 일정 기간 보관이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. 데이터 접근 권한</h2>
            <p>
              이용자의 데이터에는 데이터베이스 행 수준 보안(RLS)이 적용되어 있어
              <strong> 다른 이용자는 회원님의 데이터를 조회할 수 없습니다.</strong>
            </p>
            <p className="mt-2">
              운영자가 관리자 화면에서 확인할 수 있는 정보는 서비스 운영에 필요한 아래 항목으로 한정됩니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>회원 목록(이메일, 닉네임 또는 기관이름, 가입일, 이용 등급)</li>
              <li>사진전송 기능으로 업로드된 파일 (전송 장애 확인 및 신고 처리 목적)</li>
              <li>공지사항, 건의사항, 비밀번호 초기화 요청 내역</li>
            </ul>
            <p className="mt-2">
              <strong>인사 이력(승진·전보·수상·호봉·성과평가 등급), 부서 조직도, 외부 연락처,
              업무일정, 할 일, 예산, 메모는 관리자 화면에서 조회할 수 없습니다.</strong> 해당 정보를
              조회하는 기능은 제공하지 않습니다.
            </p>
            <p className="mt-2 font-semibold text-gray-900">
              이러한 특성상 대외비 문서, 비공개 행정자료, 타인의 개인정보가 포함된 사진은
              사진전송 기능에 업로드하지 않으시기를 권고합니다. 해당 자료는 서버로 전송되지 않는
              업무사진관리 또는 문서스캔보관함 기능을 이용해 주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. 개인정보 처리의 위탁 및 국외 이전</h2>
            <p>서비스 운영을 위해 아래 사업자에 개인정보 처리를 위탁하고 있습니다.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-3 py-2 text-left">수탁자</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">위탁 업무</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">보관 국가</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Supabase, Inc.</td>
                    <td className="border border-gray-200 px-3 py-2">회원 인증, 데이터베이스 및 파일 저장</td>
                    <td className="border border-gray-200 px-3 py-2 font-semibold">대한민국 (서울)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Vercel Inc.</td>
                    <td className="border border-gray-200 px-3 py-2">웹사이트 호스팅 및 요청 처리</td>
                    <td className="border border-gray-200 px-3 py-2 font-semibold">대한민국 (서울)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Cloudflare, Inc.</td>
                    <td className="border border-gray-200 px-3 py-2">도메인 연결 및 접속 경로 보호</td>
                    <td className="border border-gray-200 px-3 py-2">글로벌(접속 지역에 따름)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              <strong>이용자의 데이터는 대한민국(서울)에 위치한 서버에 저장되며, 서버에서의 처리 역시
              국내에서 이루어집니다.</strong> Cloudflare는 접속 요청을 전달하고 보호하는 역할만 수행하며
              이용자 데이터를 보관하지 않습니다.
            </p>
            <p className="mt-3">
              각 사업자의 개인정보처리방침은 아래에서 확인하실 수 있습니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Supabase: <a href="https://supabase.com/privacy" className="text-blue-600" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a></li>
              <li>Vercel: <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600" target="_blank" rel="noopener noreferrer">https://vercel.com/legal/privacy-policy</a></li>
              <li>Cloudflare: <a href="https://www.cloudflare.com/privacypolicy/" className="text-blue-600" target="_blank" rel="noopener noreferrer">https://www.cloudflare.com/privacypolicy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>이용자 기기와 서버 사이의 모든 통신은 HTTPS(TLS)로 암호화됩니다.</li>
              <li>서버에 저장되는 데이터에는 클라우드 사업자의 저장장치 암호화가 적용됩니다.</li>
              <li>비밀번호는 평문으로 저장하지 않으며, 인증 서비스를 통해 복호화할 수 없는 형태로만 보관합니다.</li>
              <li>데이터베이스 행 수준 보안(RLS)을 적용하여 이용자 본인의 데이터만 조회·수정할 수 있도록 제한합니다.</li>
              <li>사진전송 파일은 보관기간이 지나면 자동으로 삭제되어 서버에 무기한 축적되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. 타인의 정보 입력에 관한 안내</h2>
            <p>
              부서 조직도 및 외부 연락처 기능은 이용자가 업무 편의를 위해 직접 정보를 입력하는 기능입니다.
              해당 정보에는 제3자의 성명·연락처가 포함될 수 있으며, 이는 <strong>이용자 본인의 업무 목적
              개인 수첩 용도</strong>로 제공됩니다.
            </p>
            <p className="mt-2">
              타인의 개인정보를 입력·보관하는 경우 관련 법령 준수에 대한 책임은 이용자에게 있으며,
              업무상 필요한 범위를 넘는 정보는 입력하지 않으시기를 권고합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. 이용자의 권리와 행사 방법</h2>
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>개인정보 조회 및 수정: 앱 또는 웹사이트의 마이페이지에서 직접 가능합니다.</li>
              <li>업로드한 사진 삭제: 사진전송 화면에서 직접 삭제할 수 있습니다.</li>
              <li>회원 탈퇴 및 데이터 삭제: 마이페이지의 회원 탈퇴 기능으로 가능합니다.</li>
              <li>그 밖의 요청: 아래 문의 이메일로 접수해 주시면 지체 없이 처리합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">10. 아동의 개인정보 보호</h2>
            <p>
              본 서비스는 공무원의 업무 보조를 목적으로 하며 만 14세 미만 아동을 대상으로 하지 않습니다.
              만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">11. 처리방침의 변경</h2>
            <p>
              본 처리방침이 변경되는 경우 변경 내용과 시행일을 앱 공지사항 및 본 페이지를 통해 안내합니다.
              중요한 변경의 경우 시행일 7일 전부터 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">문의</h2>
            <p>
              개인정보 보호 책임자: 김창현<br />
              이메일: <a href="mailto:jjoraey@gmail.com" className="text-blue-600">jjoraey@gmail.com</a>
            </p>
            <p className="mt-2 text-gray-600">
              개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.
              <br />
              개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)
              <br />
              개인정보 분쟁조정위원회 (kopico.go.kr / 1833-6972)
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
