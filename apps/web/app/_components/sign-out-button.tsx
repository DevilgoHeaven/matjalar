'use client';

/**
 * 로그아웃 버튼 — 클라이언트 컴포넌트.
 * Server Action 보다 클라이언트 supabase.auth.signOut() 이 단순.
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useState } from 'react';

export function SignOutButton() {
  const [supabase] = useState(() => getSupabaseBrowserClient());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // 페이지 새로고침으로 RSC 재페치
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-action hover:bg-gray-50"
    >
      로그아웃
    </button>
  );
}
