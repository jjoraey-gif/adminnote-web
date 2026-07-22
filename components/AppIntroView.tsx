'use client';

const FEATURES = [
  {
    tag: '📅 업무일정',
    title: '공직 일정을\n월간 캘린더로 한눈에',
    desc: '간부회의, 집합교육, 출장, 행사 등 공무원 업무를 색상별로 구분해 관리하세요. 공휴일과 대체공휴일도 자동으로 표시됩니다.',
    details: ['공휴일·대체공휴일 자동 표시', '일정 카테고리별 색상 구분', 'D-Day 카운트다운'],
  },
  {
    tag: '✅ 오늘할 일',
    title: '오늘 업무 현황을\n완료율로 한번에 확인',
    desc: '하루 업무를 목록으로 정리하고 실시간 완료율로 진행 상황을 파악하세요. 미완료 항목은 다음 날에도 자동으로 이어집니다.',
    details: ['실시간 업무 완료율 표시', '미완료 항목 자동 이월', '드래그로 순서 변경'],
  },
  {
    tag: '💰 예산관리',
    title: '편성액·지출액 입력하면\n집행률 자동 계산',
    desc: '국비·도비·시비 재원 구분까지 하나로 모두 기록하세요. 사업별·전체 현황을 한 화면에서 파악할 수 있습니다.',
    details: ['사업별 집행률 자동 계산', '국비·도비·시비 재원 구분', '전체 예산 통합 현황'],
  },
  {
    tag: '📷 예산서 자동 인식',
    title: '예산서를 촬영하면\n자동으로 입력 완료',
    desc: '세출예산사업명세서를 카메라로 찍기만 하면 세부사업명·편성목·세목과 예산액이 자동으로 인식되어 바로 등록됩니다.',
    details: ['OCR 기술로 문서 자동 인식', '사진첩 이미지도 바로 인식', '촬영 한 번으로 전체 예산 등록'],
  },
  {
    tag: '📋 이력관리',
    title: '승진·발령·포상 이력과\n경과일 자동 계산',
    desc: '승진일과 발령일을 한번 입력해두면 공직 생활 일수, 현 부서 근무일, 현 직급 승진 후 경과일을 언제든 바로 확인할 수 있습니다.',
    details: ['공직 생활·부서 경과일 자동 계산', '승진·발령·포상 이력 관리', '현 직급 승진 후 경과일 표시'],
  },
  {
    tag: '📊 승진순위관리',
    title: '내 근평 순위와\n실제 예상 순위를 한눈에',
    desc: '근평 등수를 입력하면 동직급 승진자 수를 반영해 실제 예상 승진 순위를 자동으로 계산해줍니다.',
    details: ['동직급 승진자 수 반영한 예상 순위 계산', '근평순위 이력 기록 및 관리', '최근 근평후 동직급 승진자 수 추적'],
  },
  {
    tag: '🏢 부서조직도',
    title: '팀원 연락처를\n구조적으로 정리하고 QR로 공유',
    desc: '과·팀·구성원 구조로 부서 조직도를 체계적으로 관리하세요. QR 코드 한 번으로 조직도 전체를 동료 기기에 바로 전달할 수 있습니다.',
    details: ['과·팀·구성원 3단계 조직 구조 관리', '사무실·휴대폰 전화 원터치 발신', 'QR 코드로 조직도 즉시 공유'],
  },
  {
    tag: '📇 외부연락처',
    title: '업무 연락처를\n명함 촬영으로 빠르게 등록',
    desc: '카메라로 명함을 찍으면 텍스트를 자동 인식해 탭 한 번으로 각 항목에 바로 입력됩니다. 그룹별 관리와 QR 공유까지.',
    details: ['명함 촬영 → OCR 자동 인식 → 탭으로 입력', '연락처 그룹 분류 및 관리', 'QR 코드로 연락처 전체 공유'],
  },
  {
    tag: '📸 업무사진관리',
    title: '현장 기록 사진을\n날짜별로 보관',
    desc: '현장 점검, 행사, 공사 현황 등 업무 관련 사진을 날짜별로 정리하고 메모와 함께 앱 안에 안전하게 보관하세요.',
    details: ['날짜별 사진 자동 그룹화', '사진별 메모 저장', '이메일로 사진 일괄 전송'],
  },
  {
    tag: '📱→💻 사진전송',
    title: '핸드폰 사진을\n웹으로 간편하게 전송',
    desc: '앱에서 사진을 업로드하면 웹사이트에서 바로 다운로드할 수 있습니다. PC로 사진을 옮기는 가장 빠른 방법입니다.',
    details: ['하루 20장 업로드 지원', '업로드 후 3일 자동 보관 및 삭제', '웹에서 폴더 지정 후 전체 다운로드'],
  },
  {
    tag: '🗂 문서스캔보관함',
    title: '중요 문서를\n스캔해서 보관',
    desc: '공문, 지침, 계획서 등 중요한 문서를 카메라로 스캔해 앱 안에 안전하게 저장하세요. 언제 어디서든 꺼내볼 수 있습니다.',
    details: ['카메라 스캔으로 문서 디지털 보관', '여러 페이지 한 번에 스캔', '이메일로 문서 전송'],
  },
];

export default function AppIntroView() {
  return (
    <div style={{ fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0D0D0D' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 40px 60px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'inline-block', background: '#EEF4FF', color: '#2563EB', fontSize: 13, fontWeight: 700, padding: '5px 16px', borderRadius: 100, marginBottom: 28, letterSpacing: '0.04em' }}>
          공무원 업무수첩
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24 }}>
          공직생활의 모든 기록을<br />
          <span style={{ color: '#2563EB' }}>한 곳에서</span>
        </h1>
        <p style={{ fontSize: 17, color: '#6B7280', lineHeight: 1.8, marginBottom: 40 }}>
          업무일정 · 오늘할 일 · 예산관리 · 이력관리<br />
          승진순위 · 부서조직도 · 외부연락처 · 사진전송 · 문서스캔<br />
          공무원에게 꼭 맞는 모든 기능을 하나의 앱으로.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://apps.apple.com/kr/app/%EA%B3%B5%EB%AC%B4%EC%9B%90-%EC%97%85%EB%AC%B4%EC%88%98%EC%B2%A9/id6760883601"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1C1C1E', color: '#fff', padding: '14px 28px', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            <svg width="18" height="22" viewBox="0 0 20 24" fill="none"><path d="M16.5 12.4C16.48 9.86 18.6 8.61 18.7 8.55C17.48 6.74 15.55 6.51 14.88 6.49C13.28 6.31 11.73 7.41 10.9 7.41C10.06 7.41 8.78 6.51 7.43 6.54C5.66 6.57 4.01 7.59 3.1 9.19C1.22 12.41 2.63 17.1 4.44 19.69C5.35 20.96 6.41 22.38 7.8 22.33C9.15 22.28 9.65 21.49 11.28 21.49C12.9 21.49 13.37 22.33 14.77 22.3C16.21 22.28 17.13 21.01 18.01 19.73C19.07 18.27 19.5 16.84 19.52 16.77C19.49 16.76 16.52 15.66 16.5 12.4Z" fill="white"/><path d="M13.66 4.44C14.39 3.55 14.89 2.33 14.75 1.09C13.73 1.13 12.48 1.78 11.73 2.65C11.06 3.43 10.47 4.71 10.62 5.9C11.76 5.99 12.91 5.3 13.66 4.44Z" fill="white"/></svg>
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.jjoraey.adminnote"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#01875F', color: '#fff', padding: '14px 28px', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3.18 23.76c.3.17.64.2.97.1l11.65-11.65L12.34 8.75 3.18 23.76z" fill="white" opacity=".6"/><path d="M1.5 2.67A1.5 1.5 0 0 0 1 3.87v16.26a1.5 1.5 0 0 0 .5 1.2l.07.06 9.11-9.11v-.21L1.57 2.6l-.07.07z" fill="white"/><path d="M15.8 15.73l-3.04-3.04v-.22l3.04-3.04.07.04 3.6 2.05c1.03.58 1.03 1.54 0 2.12l-3.6 2.05-.07.04z" fill="white" opacity=".8"/><path d="M15.87 15.69L12.76 12.6 3.18 23.76c.34.36.89.4 1.3.1l11.39-8.17" fill="white" opacity=".4"/><path d="M15.87 9.51L4.48 1.34A1.02 1.02 0 0 0 3.18.25L12.76 12.6 15.87 9.51z" fill="white" opacity=".4"/></svg>
            Google Play
          </a>
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: '#B0B8C1' }}>무료 · iPhone · iPad · Android 지원</p>
      </div>

      {/* 기능 그리드 */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 40px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.tag}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 18,
                padding: '28px 28px 24px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', background: '#EEF4FF', display: 'inline-block', padding: '4px 12px', borderRadius: 100, marginBottom: 16 }}>
                {f.tag}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-0.02em', marginBottom: 12, whiteSpace: 'pre-line' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.75, marginBottom: 16 }}>
                {f.desc}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {f.details.map((d) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: 5 }} />
                    {d}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: '1px solid #E5E7EB', textAlign: 'center', padding: '64px 40px 40px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 16 }}>
          지금 무료로 시작하세요
        </h2>
        <p style={{ fontSize: 16, color: '#6B7280', marginBottom: 36 }}>
          App Store와 Google Play에서 무료로 다운로드하세요.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://apps.apple.com/kr/app/%EA%B3%B5%EB%AC%B4%EC%9B%90-%EC%97%85%EB%AC%B4%EC%88%98%EC%B2%A9/id6760883601"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1C1C1E', color: '#fff', padding: '14px 28px', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            <svg width="18" height="22" viewBox="0 0 20 24" fill="none"><path d="M16.5 12.4C16.48 9.86 18.6 8.61 18.7 8.55C17.48 6.74 15.55 6.51 14.88 6.49C13.28 6.31 11.73 7.41 10.9 7.41C10.06 7.41 8.78 6.51 7.43 6.54C5.66 6.57 4.01 7.59 3.1 9.19C1.22 12.41 2.63 17.1 4.44 19.69C5.35 20.96 6.41 22.38 7.8 22.33C9.15 22.28 9.65 21.49 11.28 21.49C12.9 21.49 13.37 22.33 14.77 22.3C16.21 22.28 17.13 21.01 18.01 19.73C19.07 18.27 19.5 16.84 19.52 16.77C19.49 16.76 16.52 15.66 16.5 12.4Z" fill="white"/><path d="M13.66 4.44C14.39 3.55 14.89 2.33 14.75 1.09C13.73 1.13 12.48 1.78 11.73 2.65C11.06 3.43 10.47 4.71 10.62 5.9C11.76 5.99 12.91 5.3 13.66 4.44Z" fill="white"/></svg>
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.jjoraey.adminnote"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#01875F', color: '#fff', padding: '14px 28px', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3.18 23.76c.3.17.64.2.97.1l11.65-11.65L12.34 8.75 3.18 23.76z" fill="white" opacity=".6"/><path d="M1.5 2.67A1.5 1.5 0 0 0 1 3.87v16.26a1.5 1.5 0 0 0 .5 1.2l.07.06 9.11-9.11v-.21L1.57 2.6l-.07.07z" fill="white"/><path d="M15.8 15.73l-3.04-3.04v-.22l3.04-3.04.07.04 3.6 2.05c1.03.58 1.03 1.54 0 2.12l-3.6 2.05-.07.04z" fill="white" opacity=".8"/><path d="M15.87 15.69L12.76 12.6 3.18 23.76c.34.36.89.4 1.3.1l11.39-8.17" fill="white" opacity=".4"/><path d="M15.87 9.51L4.48 1.34A1.02 1.02 0 0 0 3.18.25L12.76 12.6 15.87 9.51z" fill="white" opacity=".4"/></svg>
            Google Play
          </a>
        </div>
      </div>

      {/* 푸터 링크 */}
      <div style={{ borderTop: '1px solid #E5E7EB', padding: '24px 40px', display: 'flex', justifyContent: 'center', gap: 28 }}>
        <a href="/terms" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>서비스 이용약관</a>
        <a href="/privacy" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>개인정보 처리방침</a>
      </div>
    </div>
  );
}
