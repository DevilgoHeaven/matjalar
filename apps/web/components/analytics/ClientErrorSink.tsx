'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/events';

/**
 * R-17 — 비-React 비동기 에러를 events 테이블에 sink.
 *
 * 처리 대상:
 *  - window.onerror (ErrorEvent): 동기 코드의 잡히지 않은 throw
 *  - unhandledrejection (PromiseRejectionEvent): catch 되지 않은 Promise reject
 *
 * React 트리 내부 에러는 app/error.tsx 의 경계가 처리하므로 본 sink 는 그 바깥만 담당.
 *
 * 무한 루프 방어:
 *  - trackEvent 내부의 fetch 가 실패해도 catch 가 console.debug 만 호출 (다시 sink 안 함).
 *
 * payload 크기 가드 (server RPC insert_event 가 4KB cap):
 *  - 클라이언트에서 미리 message 500자, stack 2000자, url 300자로 truncate.
 *
 * 마운트는 layout.tsx 최상단(<body> 직속 첫 자식) — 모든 자식 트리 mount 이전에 listener 등록.
 */
export function ClientErrorSink() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      const messageRaw =
        event.message ||
        (event.error instanceof Error ? event.error.message : String(event.error ?? 'unknown'));
      const stack = event.error instanceof Error ? event.error.stack : undefined;
      void trackEvent({
        type: 'client_error',
        message: truncate(messageRaw, 500) ?? 'unknown',
        ...(stack ? { stack: truncate(stack, 2000)! } : {}),
        ...(event.filename ? { url: truncate(event.filename, 300)! } : {}),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const rawMessage =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : tryStringify(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      void trackEvent({
        type: 'client_error',
        message: truncate(`[unhandledrejection] ${rawMessage}`, 500) ?? 'unknown',
        ...(stack ? { stack: truncate(stack, 2000)! } : {}),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}

function truncate(str: string | undefined, max: number): string | undefined {
  if (!str) return undefined;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function tryStringify(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 200);
  } catch {
    return '[unserializable]';
  }
}
