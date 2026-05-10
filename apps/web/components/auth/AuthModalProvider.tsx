'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ActionDescriptor } from './types';
import { dispatchPendingAction } from './action-dispatcher';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { trackEvent } from '@/lib/analytics/events';

/** ────────────────────────────────────────────────
 * Context 타입 정의
 * ──────────────────────────────────────────────── */

/**
 * AuthModal 컨텍스트가 외부에 노출하는 API.
 *
 * - `openAuthModal`: 비회원 인터랙션 발생 시 호출. 시도한 액션을 기억한 채로 모달을 열고
 *   sessionStorage 에 직렬화 저장하여 새로고침 후에도 복원 가능.
 * - `pendingAction`: 로그인 완료 후 실행 대기 중인 액션 디스크립터 (없으면 null).
 * - `isOpen`: 모달 열림 여부.
 * - `closeModal`: 모달 닫기 (pendingAction 은 유지 — 로그인 포기 시에도 재시도 가능).
 */
interface AuthModalContextValue {
  openAuthModal: (descriptor: ActionDescriptor) => void;
  pendingAction: ActionDescriptor | null;
  isOpen: boolean;
  closeModal: () => void;
}

/** ────────────────────────────────────────────────
 * Context 생성
 * ──────────────────────────────────────────────── */
const AuthModalContext = createContext<AuthModalContextValue | null>(null);

/** sessionStorage 키 상수 */
const STORAGE_KEY = 'mzr_pending';

/** ────────────────────────────────────────────────
 * Provider 컴포넌트
 * ──────────────────────────────────────────────── */

/**
 * 앱 루트에 마운트하는 인증 모달 공급자.
 *
 * ### 역할
 * 1. 비회원이 북마크·투표·후기 등 로그인 필요 액션을 시도할 때
 *    `openAuthModal(descriptor)` 호출 → 모달 + sessionStorage 보관.
 * 2. Supabase `onAuthStateChange` SIGNED_IN 이벤트 → 보관된 descriptor 자동 실행.
 * 3. 새로고침 복원: 마운트 시 sessionStorage 에서 pendingAction 을 읽어 복원.
 *
 * ### Stale closure 회피
 * `pendingAction` 을 useRef 로도 미러링해 onAuthStateChange 콜백이 항상 최신 값을 읽음.
 *
 * ### M2 완료 사항
 * - dispatchPendingAction 연결 (action-dispatcher.ts)
 * - 카카오·구글 OAuth 버튼 UI
 * - login_modal_open / login_completed events 기록
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionDescriptor | null>(null);

  // Stale closure 회피용 ref — useEffect 콜백이 최신 pendingAction 을 읽도록
  const pendingActionRef = useRef<ActionDescriptor | null>(null);

  // Supabase 클라이언트 — 모듈 레벨 싱글턴 보장 위해 lazy useState 사용 (StrictMode 안전)
  const [supabase] = useState(() => getSupabaseBrowserClient());

  /** pendingAction 변경 시 ref 동기화 */
  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  /** 마운트 시 sessionStorage 에서 이전 pendingAction 복원 */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as ActionDescriptor;
        setPendingAction(restored);
      }
    } catch {
      // 역직렬화 실패 시 무시 (오염된 데이터 방어)
    }
  }, []);

  /** Supabase 인증 상태 변화 구독 — pendingAction 자동 실행 */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session) return;

      // 모달 닫기 (UX: 로그인 성공 시 즉시)
      setIsOpen(false);

      // KPI 이벤트 기록 — provider 추출
      const provider = (session.user.app_metadata?.provider ?? 'kakao') as
        | 'kakao'
        | 'google';
      void trackEvent({ type: 'login_completed', provider });

      // 보관된 descriptor 실행
      const descriptor = pendingActionRef.current;
      if (!descriptor) return;

      const result = await dispatchPendingAction(descriptor);

      if (result.ok) {
        // 성공 시 descriptor 제거 (재실행 방지)
        setPendingAction(null);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {
            /* noop */
          }
        }
        // 페이지 이동 필요한 액션 (예: comboNew)
        if (result.redirectTo && typeof window !== 'undefined') {
          window.location.assign(result.redirectTo);
        }
      } else {
        // 실패 시 사용자에게 알림 — v1 은 console 로 (Toast 컴포넌트는 v1.5)
        console.error('[mzr:auth] dispatch 실패:', result.error);
      }
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * 비회원 인터랙션 진입점.
   * descriptor 를 상태 + sessionStorage 에 저장하고 모달을 연다.
   */
  const openAuthModal = useCallback((descriptor: ActionDescriptor) => {
    setPendingAction(descriptor);
    setIsOpen(true);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(descriptor));
      } catch {
        /* 프라이빗 브라우징 등 스토리지 쓰기 실패 시 무시 */
      }
    }
    // KPI: 로그인 모달 노출 이벤트
    const actionType: 'bookmark' | 'vote' | 'review' | 'register' =
      descriptor.type === 'bookmark'
        ? 'bookmark'
        : descriptor.type === 'vote'
          ? 'vote'
          : descriptor.type === 'reviewSubmit'
            ? 'review'
            : 'register';
    void trackEvent({
      type: 'login_modal_open',
      action_type: actionType,
      ...(descriptor.type === 'bookmark' || descriptor.type === 'vote'
        ? { combo_id: descriptor.comboId }
        : {}),
    });
  }, []);

  /** 모달 닫기 — pendingAction 은 유지 (재시도 가능) */
  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * OAuth 로그인 시작 — 카카오 또는 구글
   * Supabase 가 provider 페이지로 리디렉트하고, 콜백은 /auth/callback 로 돌아옴.
   */
  const startOAuth = useCallback(
    async (provider: 'kakao' | 'google') => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const next = typeof window !== 'undefined' ? window.location.pathname : '/';
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          ...(provider === 'kakao'
            ? { scopes: 'profile_nickname profile_image' }
            : {}),
        },
      });
      if (error) {
        console.error('[mzr:auth] signInWithOAuth 실패:', error.message);
      }
    },
    [supabase]
  );

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, pendingAction, isOpen, closeModal }}
    >
      {children}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="로그인이 필요합니다"
          onClick={closeModal}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <h2 className="text-lg font-semibold text-action">3초 로그인</h2>
            <p className="mt-1 text-sm text-gray-600">
              따봉·찜·후기는 회원만 가능해요.<br />
              아래 버튼으로 빠르게 로그인하세요.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void startOAuth('kakao')}
                className="w-full rounded-lg bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] hover:opacity-90"
              >
                카카오로 시작하기
              </button>
              <button
                type="button"
                onClick={() => void startOAuth('google')}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-action hover:bg-gray-50"
              >
                Google 로 시작하기
              </button>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="mt-4 w-full text-xs text-gray-500 underline"
            >
              나중에 할게요
            </button>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

/** ────────────────────────────────────────────────
 * 커스텀 훅
 * ──────────────────────────────────────────────── */

/**
 * AuthModal 컨텍스트를 소비하는 커스텀 훅.
 * Provider 바깥에서 호출하면 즉시 오류를 던져 누락을 조기 탐지.
 */
export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error(
      'useAuthModal 은 AuthModalProvider 하위에서만 사용할 수 있습니다.'
    );
  }
  return ctx;
}
