'use client';

import { useEffect } from 'react';
import { trackEvent, type EventDescriptor } from '@/lib/analytics/events';

interface PageEventsProps {
  events: EventDescriptor[];
}

/**
 * 페이지 진입 KPI 이벤트를 클라이언트에서 전송한다.
 *
 * Server Component 는 referrer/session cookie 접근이 제한적이므로, 실제 브라우저
 * 마운트 시점에 events 테이블로 보낸다. 실패는 analytics 헬퍼에서 best-effort 처리한다.
 */
export function PageEvents({ events }: PageEventsProps) {
  const serializedEvents = JSON.stringify(events);

  useEffect(() => {
    const parsedEvents = JSON.parse(serializedEvents) as EventDescriptor[];
    for (const event of parsedEvents) {
      if (isAlreadySentOnce(event)) continue;
      void trackEvent(event);
    }
  }, [serializedEvents]);

  return null;
}

function isAlreadySentOnce(event: EventDescriptor) {
  if (event.type !== 'combo_register_submitted') return false;
  if (typeof window === 'undefined') return false;

  const key = `mzr_event_once:${event.type}:${event.combo_id}`;
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
  } catch {
    return false;
  }

  return false;
}
