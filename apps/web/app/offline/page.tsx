/**
 * 오프라인 fallback 페이지 (PWA)
 *
 * Serwist 의 fallbacks.entries 에서 navigation 요청이 fetch 실패 시 본 페이지를 반환.
 * (apps/web/app/sw.ts 의 Serwist 설정 참조)
 *
 * 정적 페이지 — 어떤 데이터 페치도 하지 않아야 SW 가 precache 한 사본만으로 동작.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '오프라인 — 맛잘알',
  robots: { index: false },
};

export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-5 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-5xl" aria-hidden="true">
          📡
        </p>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-action">
          오프라인 상태예요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          인터넷 연결이 끊겨 새로운 정보를 가져올 수 없습니다.
          <br />
          이미 본 적 있는 카드는 캐시에서 계속 볼 수 있어요.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-lg bg-action px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            홈으로 가기
          </Link>
          <Link
            href="/bookmarks"
            className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-action hover:bg-stone-50"
          >
            찜한 조합 보기 (캐시)
          </Link>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-stone-400">
          연결이 복구되면 자동으로 최신 카드를 불러옵니다.
        </p>
      </div>
    </main>
  );
}
