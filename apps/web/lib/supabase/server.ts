import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@mzr/db';

// supabase/ssr v0.10 cookies setAll 시그니처 — 2번째 인자 headers 추가
// (Cache-Control: private, no-cache, no-store / Expires: 0 / Pragma: no-cache)
// 출처: https://github.com/supabase/ssr/releases/tag/v0.10.0 — CDN 인증 응답 캐싱 방지
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server Component / Server Action 용 Supabase 클라이언트
 *
 * - Next.js 15 의 async cookies() 사용 (R-19 edge runtime 호환)
 * - 쿠키 기반 세션 자동 처리 — RLS 정책 결합
 * - Server Action 에서 진입 시 반드시 getSession() 명시 호출 (스테일 세션 회피)
 *
 * setAll 의 2번째 인자 `headers` 는 CDN 캐시 차단용 응답 헤더 후보다.
 * RSC/Server Action 컨텍스트에서는 Next.js 가 cookies().set() 호출만으로
 * 자동으로 dynamic 응답 처리해서 CDN 캐시가 발생하지 않으므로 무시 가능.
 * Route Handler(/auth/callback) 와 middleware 에서는 NextResponse 에 직접 적용.
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
  // v0.10: createServerClient 의 type parameter 는 (Database, SchemaName) 2개로 축소.
  //   기존 v0.5 의 3번째 인자 Database['public'] 제거 필요.
  return createServerClient<Database, 'public'>(
    url,
    anon,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: CookieToSet[], _headers: Record<string, string>) => {
          // _headers 는 RSC/Server Action 에서는 응답 객체 접근 불가하므로 무시.
          // Route Handler/middleware 에서 사용하는 별도 클라이언트는 직접 헤더 적용.
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
