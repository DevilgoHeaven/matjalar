/**
 * App Router 404 (R-26)
 *
 * - /combo/[id] 의 notFound() 또는 존재하지 않는 라우트 → 본 화면
 * - 비회원도 노출되므로 RSC 안전 (server-side, no client hooks)
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-4xl">🔎</p>
      <h1 className="mt-4 text-xl font-bold">찾으시는 페이지가 없어요</h1>
      <p className="mt-2 text-sm text-gray-600">
        주소가 바뀌었거나, 조합이 비공개로 전환됐을 수 있어요.
      </p>

      <Link
        href="/"
        className="mt-6 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
