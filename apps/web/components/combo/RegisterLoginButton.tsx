'use client';

import { useAuthModal } from '@/components/auth/AuthModalProvider';

export function RegisterLoginButton() {
  const { openAuthModal } = useAuthModal();

  return (
    <button
      type="button"
      onClick={() => openAuthModal({ type: 'comboNew' })}
      className="inline-flex h-11 items-center justify-center rounded-md bg-action px-5 text-sm font-black text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      로그인하고 등록하기
    </button>
  );
}
