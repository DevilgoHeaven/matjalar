// Next.js 15.2.3+ 설정
// - CVE-2025-29927 patch 가 포함된 버전 (R-01 완화)
// - transpilePackages 로 모노레포 워크스페이스 패키지 import 가능 (R-07 완화)
// - serwist 로 PWA 래핑 (manifest + offline fallback)

import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  // ⚠️ Server Action POST 가 SW 에 의해 가로채지지 않도록, 캐시 전략은 GET 만 (R-05)
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const config = {
  // 워크스페이스 패키지 트랜스파일 — R-07
  transpilePackages: ['@mzr/db', '@mzr/ui'],

  // 이미지 정책: v1 은 이미지 노출 X. next/image 자체는 미사용 (eslint 가 추가로 막음 — R-14)
  images: {
    unoptimized: true,
  },

  // React strict mode (잠재 버그 조기 노출)
  reactStrictMode: true,

  // 한국어 페이지가 기본
  // i18n 설정은 v1.5 다국어 지원 시 추가
};

export default withSerwist(config);
