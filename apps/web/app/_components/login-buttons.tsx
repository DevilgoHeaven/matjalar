'use client';

/**
 * 임시 검증용 로그인 버튼 — / 페이지에 노출.
 *
 * AuthModalProvider 의 openAuthModal 을 직접 호출해 모달을 띄운다.
 * descriptor 는 'comboNew' 더미 (실제 동작은 모달 내 OAuth 버튼).
 *
 * M6 에서 본격 카테고리 홈으로 교체되면 본 컴포넌트는 제거.
 */

import { useAuthModal } from '@/components/auth/AuthModalProvider';

export function LoginButtons() {
  const { openAuthModal } = useAuthModal();

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center">
      <p className="text-sm text-gray-700">로그인 흐름 검증용 버튼</p>
      <p className="mt-1 text-xs text-gray-500">
        모달 → 카카오/Google → /auth/callback → 자동 리디렉트
      </p>
      <button
        type="button"
        onClick={() => openAuthModal({ type: 'comboNew' })}
        className="mt-4 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white"
      >
        로그인 모달 열기
      </button>
    </div>
  );
}
