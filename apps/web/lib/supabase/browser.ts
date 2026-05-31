import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@mzr/db';

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * - onAuthStateChange listener 등록에 사용 (AuthModalProvider)
 *
 * v0.10: createBrowserClient 의 type parameter 는 (Database, SchemaName) 2개로 축소.
 *   기존 v0.5 의 3번째 인자 Database['public'] 제거 필요.
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database, 'public'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
