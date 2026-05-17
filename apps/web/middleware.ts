/**
 * Next.js 미들웨어 — Supabase 세션 갱신 + /admin 가드
 *
 * 흐름:
 *  1. supabase/ssr 의 createServerClient 로 세션 자동 갱신 (모든 요청)
 *  2. /admin/* 경로면 JWT claim 검증:
 *     - 세션 없음 → / 로 리디렉트
 *     - is_admin claim != 'true' → / 로 리디렉트
 *  3. R-09: SQL 함수 대신 JWT claim 사용 (재귀 회피)
 *  4. R-19: edge runtime 호환 — supabase/ssr 외 모듈 import 금지
 *  5. R-01: Next.js 15.2.3+ 의 CVE-2025-29927 패치가 본 가드를 신뢰 가능하게 함
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  // 응답 객체를 미리 만들어 cookie set 결과를 누적
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // env 미설정 시 즉시 명확한 500 (침묵 실패 방지)
  if (!url || !anon) {
    return new NextResponse(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정',
      { status: 500 }
    );
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      // v0.10 시그니처: 2번째 인자 headers — CDN 캐시 차단용
      // (Cache-Control: private,no-cache,no-store,must-revalidate,max-age=0 / Expires:0 / Pragma:no-cache)
      // middleware 는 NextResponse 를 직접 만들므로 응답 헤더에 적용 가능.
      setAll: (toSet: CookieToSet[], headers: Record<string, string>) => {
        // 쿠키 갱신은 request 와 response 양쪽에 동기화
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        // CDN 인증 응답 캐싱 방지 — Supabase 권장 헤더 그대로 적용
        for (const [headerName, headerValue] of Object.entries(headers)) {
          response.headers.set(headerName, headerValue);
        }
      },
    },
  });

  // 세션 갱신 (만료된 access token 자동 refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /admin 가드 — 세션 + is_admin claim 모두 통과해야 함
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/?error=admin_login_required', request.url));
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Custom Access Token Hook 가 채운 is_admin claim 확인
    const claims = session?.access_token
      ? parseJwtClaims(session.access_token)
      : null;
    const isAdmin = claims?.is_admin === 'true';

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/?error=admin_only', request.url));
    }
  }

  return response;
}

/**
 * JWT payload 를 base64url 디코딩해 claims 를 꺼낸다.
 *
 * WHY: middleware 에서 외부 jwt 라이브러리 import 시 edge runtime 부담 ↑.
 * JWT 는 이미 Supabase 가 서명·검증한 토큰이므로 payload 만 읽으면 충분하다.
 */
function parseJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * 다음 경로 제외:
     * - _next/static (정적 자산)
     * - _next/image (이미지 최적화)
     * - favicon.ico, sw.js, manifest.json (PWA)
     * - api/events (POST 빈번, 세션 검사 비용 절감)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api/events).*)',
  ],
};
