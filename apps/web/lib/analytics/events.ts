/**
 * KPI 추적 이벤트 명세 + 전송 헬퍼
 *
 * 명명 규칙·KPI 매핑은 docs/decisions/03-event-naming.md 참조.
 * v1 은 자체 events 테이블이 SOT, Plausible 은 페이지뷰 보조.
 */
import { getOrCreateSessionId } from './session-id';

export type EventDescriptor =
  | { type: 'page_view'; pathname: string; referrer?: string }
  | { type: 'list_view'; list_kind: 'home' | 'brand' | 'search'; count: number }
  | { type: 'detail_view'; combo_id: string }
  | { type: 'login_modal_open'; action_type: 'bookmark' | 'vote' | 'review' | 'register'; combo_id?: string }
  | { type: 'login_completed'; provider: 'kakao' | 'google' }
  | { type: 'vote_click'; combo_id: string; after: 'on' | 'off' }
  | { type: 'bookmark_click'; combo_id: string; after: 'on' | 'off' }
  | { type: 'review_submit'; combo_id: string; rating: number }
  | { type: 'combo_register_started' }
  | { type: 'combo_register_submitted'; combo_id: string }
  | { type: 'client_error'; message: string; stack?: string; url?: string }
  | { type: 'report_submit'; target_type: 'combo' | 'review'; target_id: string };

export async function trackEvent(descriptor: EventDescriptor): Promise<void> {
  if (typeof window === 'undefined') return;

  const { type, ...payload } = descriptor;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        session_id: sessionId,
        type,
        payload,
      }),
    });
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.debug('[mzr:event] 전송 실패', error);
    }
  }
}
