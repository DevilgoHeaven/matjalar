'use client';

/**
 * App Router 글로벌 에러 경계 (R-26)
 *
 * Server Component / Client Component 의 런타임 에러를 잡아
 * 사용자 친화 화면을 노출. Next.js 가 본 컴포넌트로 자동 폴백.
 *
 * - 5xx (DB 쿼리 실패 등) → 본 화면
 * - 디지털 사이니지 같은 페이지에서 노출되어도 안전한 톤
 * - reset() 호출로 에러 영역만 재시도 (전체 페이지 새로고침 X)
 */

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/events';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error.digest ?? '(no-digest)', error);
    void trackEvent({
      type: 'client_error',
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="mt-4 text-xl font-bold">앗, 잠깐 문제가 생겼어요</h1>
      <p className="mt-2 text-sm text-gray-600">
        서버 응답이 일시적으로 막힌 것 같아요. 잠시 후 다시 시도해 주세요.
      </p>
      {error.digest ? (
        <p className="mt-1 text-xs text-gray-400">에러 ID: {error.digest}</p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
    </main>
  );
}
