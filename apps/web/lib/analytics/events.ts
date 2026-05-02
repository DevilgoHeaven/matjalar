/**
 * KPI 추적 이벤트 명세 + 전송 헬퍼
 *
 * 명명 규칙·KPI 매핑은 docs/decisions/03-event-naming.md 참조.
 * v1 은 자체 events 테이블이 SOT, Plausible 은 페이지뷰 보조.
 */
export type EventDescriptor =
  | { type: 'page_view'; pathname: string; referrer?: string }
  | { type: 'list_view'; list_kind: 'home' | 'brand' | 'search'; count: number }
  | { type: 'detail_view'; combo_id: number }
  | { type: 'login_modal_open'; action_type: 'bookmark' | 'vote' | 'review' | 'register'; combo_id?: number }
  | { type: 'login_completed'; provider: 'kakao' | 'google' }
  | { type: 'vote_click'; combo_id: number; after: 'on' | 'off' }
  | { type: 'bookmark_click'; combo_id: number; after: 'on' | 'off' }
  | { type: 'review_submit'; combo_id: number; rating: number }
  | { type: 'combo_register_started' }
  | { type: 'combo_register_submitted'; combo_id: number }
  | { type: 'client_error'; message: string; stack?: string; url?: string }
  | { type: 'report_submit'; target_type: 'combo' | 'review'; target_id: number };

export async function trackEvent(descriptor: EventDescriptor): Promise<void> {
  // M8: POST /api/events (실제 INSERT 는 그때)
  // 지금은 console.debug + return (dev 단계)
  if (typeof console !== 'undefined') console.debug('[mzr:event]', descriptor);
}
