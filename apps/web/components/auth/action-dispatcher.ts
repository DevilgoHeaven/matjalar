/**
 * ActionDescriptor → 실제 Server Action 매퍼
 *
 * AuthModalProvider 가 onAuthStateChange('SIGNED_IN') 직후 호출.
 * descriptor 는 sessionStorage 에서 복원되거나 Context 에 보관된 값.
 *
 * 각 액션의 실제 Server Action 은 M3~M5 에서 채워짐.
 * 지금은 매퍼 골격 + 호출 시그니처만 정의.
 */

import type { ActionDescriptor } from './types';

/** 매퍼 결과 타입 */
export type DispatchResult =
  | { ok: true; redirectTo?: string; refresh?: boolean }
  | { ok: false; error: string };

/**
 * descriptor 의 type 에 따라 적절한 Server Action 을 호출한다.
 *
 * WHY 동적 import: Server Action 모듈이 클라이언트 번들에 들어가지 않도록
 * 호출 시점에만 로드. 'use server' export 는 fetch 처럼 호출됨.
 */
export async function dispatchPendingAction(
  descriptor: ActionDescriptor
): Promise<DispatchResult> {
  try {
    switch (descriptor.type) {
      case 'bookmark': {
        const { toggleBookmark } = await import('@/app/actions/bookmarks');
        const result = await toggleBookmark(descriptor.comboId);
        return result.ok
          ? { ok: true, refresh: true }
          : { ok: false, error: result.error };
      }
      case 'vote': {
        const { toggleVote } = await import('@/app/actions/votes');
        const result = await toggleVote(descriptor.comboId);
        return result.ok
          ? { ok: true, refresh: true }
          : { ok: false, error: result.error };
      }
      case 'reviewSubmit': {
        const { submitReview } = await import('@/app/actions/reviews');
        const result = await submitReview({
          comboId: descriptor.comboId,
          rating: descriptor.rating,
          content: descriptor.content,
        });
        return result.ok
          ? { ok: true, refresh: true }
          : { ok: false, error: result.error };
      }
      case 'reviewVote': {
        const { toggleReviewVote } = await import('@/app/actions/review-votes');
        const result = await toggleReviewVote(descriptor.reviewId);
        return result.ok
          ? { ok: true, refresh: true }
          : { ok: false, error: result.error };
      }
      case 'comboNew': {
        // 페이지 이동만 — descriptor 만 있으면 redirect
        return { ok: true, redirectTo: '/combo/new' };
      }
      default: {
        // exhaustive check — 새 ActionDescriptor 추가 시 컴파일 에러
        const _exhaustive: never = descriptor;
        throw new Error(`알 수 없는 ActionDescriptor: ${JSON.stringify(_exhaustive)}`);
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : '알 수 없는 오류';
    return { ok: false, error: message };
  }
}
