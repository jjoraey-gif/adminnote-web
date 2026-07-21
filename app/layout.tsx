import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdminNote | 공무원 업무수첩',
  description: '공무원을 위한 스마트 업무 관리 앱',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
