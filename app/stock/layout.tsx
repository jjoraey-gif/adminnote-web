import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOXL 자동매매',
  robots: { index: false, follow: false },
};

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
}
