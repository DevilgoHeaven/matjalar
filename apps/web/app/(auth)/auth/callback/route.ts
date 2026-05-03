/**
 * /auth/callback — OAuth 콜백 (PKCE code exchange)
 *
 * Supabase OAuth 흐름:
 *  1. 클라이언트에서 supabase.auth.signInWithOAuth({ provider: 'kakao' | 'google' })
 *  2. provider 페이지로 리디렉트
 *  3. 인증 완료 후 Supabase 가 ?code=... 와 함께 redirectTo 로 돌아옴
 *  4. 본 라우트가 code 를 세션 쿠키로 교환 (exchangeCodeForSession)
 *  5. 쿼리 ?next= 가 있으면 해당 경로로, 없으면 / 로 리디렉트
 *
 * 첫 로그인 시 handle_new_user trigger 가 app_users 자동 생성 (R-08).
 * Custom Access Token Hook 가 is_admin claim 을 채움 (R-09).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const errorDescription = searchParams.get('error_description');

  // OAuth 자체 실패 (사용자 거부, provider 에러 등)
  if (errorDescription) {
    const params = new URLSearchParams({ error: errorDescription });
    return NextResponse.redirect(`${origin}/?${params.toString()}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    return NextResponse.redirect(`${origin}/?${params.toString()}`);
  }

  // 안전한 redirect — 같은 origin 또는 상대경로만 허용 (open redirect 방어)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return NextResponse.redirect(`${origin}${safeNext}`);
}
