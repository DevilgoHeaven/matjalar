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
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

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
 *    `openAuthModal(descriptor)` 를 호출하면 모달을 열고 액션을 sessionStorage 에 보관.
 * 2. Supabase `onAuthStateChange` 를 통해 SIGNED_IN 이벤트 수신 시
 *    보관된 액션을 자동으로 실행 (`dispatchPendingAction` — M2 구현 예정).
 * 3. 새로고침 복원: 마운트 시 sessionStorage 에서 pendingAction 을 읽어 복원.
 *
 * ### TODO M2
 * - `dispatchPendingAction` 내부: descriptor.type → toggleBookmark / toggleVote /
 *   submitReview / navigateComboNew 등 실제 액션 매퍼 연결.
 * - 모달 UI: 현재 placeholder(children 렌더링) — 실제 OAuth 버튼 UI 로 교체.
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionDescriptor | null>(null);

  // Supabase 클라이언트는 싱글턴 보장을 위해 ref 에 보관
  const supabaseRef = useRef(getSupabaseBrowserClient());

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

  /** Supabase 인증 상태 변화 구독 */
  useEffect(() => {
    const supabase = supabaseRef.current;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          setIsOpen(false);
          // TODO M2: dispatchPendingAction(pendingAction) 연결
          // 현재는 콘솔 로그만 (dev 단계)
          console.debug('[mzr:auth] SIGNED_IN — pendingAction 실행 예정 (M2)');
        }
      }
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 비회원 인터랙션 진입점.
   * 액션 디스크립터를 상태 + sessionStorage 에 저장하고 모달을 연다.
   */
  const openAuthModal = useCallback((descriptor: ActionDescriptor) => {
    setPendingAction(descriptor);
    setIsOpen(true);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(descriptor));
      } catch {
        // 프라이빗 브라우징 등 스토리지 쓰기 실패 시 무시
      }
    }
  }, []);

  /** 모달 닫기 — pendingAction 은 유지 (재시도 가능) */
  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, pendingAction, isOpen, closeModal }}
    >
      {children}

      {/* TODO M2: isOpen 조건부로 실제 OAuth 모달 UI 렌더링 (카카오·구글 버튼) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="로그인 필요"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
        >
          {/* TODO M2: 실제 로그인 UI 컴포넌트로 교체 */}
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '0.5rem' }}>
            <p>로그인이 필요합니다. (M2 UI 구현 예정)</p>
            <button onClick={closeModal}>닫기</button>
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
