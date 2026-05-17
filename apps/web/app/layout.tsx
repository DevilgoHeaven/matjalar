/**
 * 루트 레이아웃
 *
 * - 모든 페이지를 감싸는 최상위 컴포넌트
 * - AuthModalProvider 는 Stage 3 에서 추가 (회원 전용 인터랙션 큐)
 * - manifest.json + 메타 태그 (PWA)
 * - 한국어(ko-KR) 기본
 */

import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthModalProvider } from '@/components/auth/AuthModalProvider';
import { ClientErrorSink } from '@/components/analytics/ClientErrorSink';
import { SiteFooter } from '@/components/legal/SiteFooter';

export const metadata: Metadata = {
  title: '맛잘알 — 프랜차이즈 꿀조합 위키',
  description: '서브웨이부터 시작하는 꿀조합 카드. 30초 안에 골라보세요.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '맛잘알',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR">
      <body>
        {/* R-17 — window.onerror / unhandledrejection 글로벌 sink (트리 최상단) */}
        <ClientErrorSink />
        {/* AuthModalProvider — Context + sessionStorage descriptor + onAuthStateChange */}
        <AuthModalProvider>{children}</AuthModalProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
