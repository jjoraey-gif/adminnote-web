import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdminNote | 공무원 업무수첩',
  description: '공무원을 위한 스마트 업무 관리 앱',
  // 브라우저는 자기가 읽을 수 있는 것 중 맨 앞을 쓴다. 최신 브라우저는 SVG,
  // 못 읽는 구형 브라우저는 .ico로 내려간다.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',   // 아이폰 '홈 화면에 추가'
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
