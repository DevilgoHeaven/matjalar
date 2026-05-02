import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@mzr/db';

// supabase/ssr v0.5 cookies setAll 시그니처 — 타입을 명시해 strict mode 통과
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server Component / Server Action 용 Supabase 클라이언트
 *
 * - Next.js 15 의 async cookies() 사용 (R-19 edge runtime 호환)
 * - 쿠키 기반 세션 자동 처리 — RLS 정책 결합
 * - Server Action 에서 진입 시 반드시 getSession() 명시 호출 (스테일 세션 회피)
 */
export async function getSupabaseServerClient() {
  // I-6 review: admin.ts 와 동일하게 환경변수 누락 시 명확한 에러 — 침묵 실패 방지
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정. .env.local 확인 필요.'
    );
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(
    url,
    anon,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 에서 set 호출 시 에러 무시 (Next.js 권장 패턴)
          }
        },
      },
    }
  );
}
