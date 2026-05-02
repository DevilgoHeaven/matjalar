import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@mzr/db';

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * - onAuthStateChange listener 등록에 사용 (AuthModalProvider)
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
