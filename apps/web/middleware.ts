/**
 * Next.js 미들웨어 — /admin 가드 (R-01: CVE-2025-29927 패치 버전 15.2.3+ 필수)
 *
 * 흐름:
 *  1. 모든 요청에서 Supabase 세션 갱신 (쿠키 기반)
 *  2. /admin/* 경로면 추가로 JWT claim is_admin 체크
 *     - is_admin SQL 함수 대신 JWT claim 사용 (R-09: 재귀 회피)
 *  3. 미인증/비관리자는 / 로 리디렉트
 *
 * Edge runtime 제약 (R-19): packages/db 함수 import 금지. supabase/ssr 만 사용.
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // TODO: Stage 3 — supabase/ssr 의 createServerClient 로 세션 갱신
  // 지금은 골격만, 실제 가드 로직은 Stage 3 에서 추가

  const { pathname } = request.nextUrl;

  // /admin 경로 — M2 정식 구현 전까지 임시 봉쇄 (C-3 review, R-01 보강)
  // 인증·is_admin claim 검증 로직은 M2 에서 추가. 그 전까지 노출 불가.
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // matcher: /admin 외에 세션 갱신을 위해 거의 모든 경로 매칭
  matcher: [
    /*
     * 다음 경로 제외:
     * - _next/static (정적 자산)
     * - _next/image (이미지 최적화)
     * - favicon.ico, sw.js, manifest.json (PWA)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
};
