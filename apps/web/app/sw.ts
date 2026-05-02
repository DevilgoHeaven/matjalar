/// <reference lib="webworker" />
/**
 * 서비스 워커 — serwist 기반
 *
 * 전략:
 *  - GET 만 캐시 (R-05: Server Action POST 가로채기 방지)
 *  - /combo/[id] 는 StaleWhileRevalidate (매장 앞에서 빠른 재방문)
 *  - offline fallback 페이지 제공
 *
 * 정식 구현은 M8 에서. 지금은 골격.
 *
 * `lib="webworker"` 트리플슬래시 참조로 ServiceWorkerGlobalScope 타입 노출.
 */

import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * runtimeCaching: defaultCache 의 모든 엔트리에 명시적으로 method:['GET'] 강제 (C-1 review, R-05)
 * - Server Action 의 POST/PUT/PATCH/DELETE 가 SW 에 가로채지 않도록 보장
 * - defaultCache 자체도 GET 만 매칭하지만, 필터를 명시해 의도를 코드로 박음
 */
const guardedRuntimeCaching = defaultCache.map((entry) => ({
  ...entry,
  method: 'GET' as const,
}));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // M8: /combo/[id] StaleWhileRevalidate 엔트리 추가 예정
  runtimeCaching: guardedRuntimeCaching,
});

serwist.addEventListeners();
