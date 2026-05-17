/// <reference lib="webworker" />
/**
 * 서비스 워커 — serwist 9.x 기반
 *
 * 전략 (PRD §3 + plan §13):
 *  - GET 만 캐시 (R-05: Server Action POST 가로채기 방지)
 *  - /combo/* StaleWhileRevalidate — 매장 앞에서 빠른 재방문, 7일 보존
 *  - defaultCache 의 정적 자산·내비게이션은 기본 전략 그대로 사용
 *  - 오프라인 fallback: /offline 페이지 (apps/web/app/offline/page.tsx)
 *
 * `lib="webworker"` 트리플슬래시 참조로 ServiceWorkerGlobalScope 타입 노출.
 */

import { defaultCache } from '@serwist/next/worker';
import {
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * 1) 커스텀 캐시 — /combo/* 상세 페이지
 *    StaleWhileRevalidate: 캐시 즉시 반환 + 백그라운드 재검증으로 최신화
 *    매장 앞에서 흔히 다시 보는 카드를 0초 로딩으로 보여주기 위함 (PRD §3 시나리오)
 */
const comboDetailRoute = {
  matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/combo/'),
  handler: new StaleWhileRevalidate({
    cacheName: 'mzr-combo-detail',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50, // 캐시 50개 카드 한도 — Free tier 디바이스 디스크 절약
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
      }),
    ],
  }),
  method: 'GET' as const,
};

/**
 * 2) defaultCache 의 모든 엔트리에 method:'GET' 강제 (R-05)
 *    Server Action 의 POST/PUT/PATCH/DELETE 가 SW 에 가로채지 않도록 보장.
 *    defaultCache 자체도 GET 만 매칭하지만, 명시해 의도를 코드로 박음.
 */
const guardedDefault = defaultCache.map((entry) => ({
  ...entry,
  method: 'GET' as const,
}));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // 커스텀 entry 가 default 보다 먼저 매칭되도록 prepend
  runtimeCaching: [comboDetailRoute, ...guardedDefault],
  // 오프라인 navigation 폴백 — fetch 실패 시 precache 된 /offline 페이지로 fallback
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
