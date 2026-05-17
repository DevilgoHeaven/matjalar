/**
 * 카테고리 홈 (/) — M0/M2 임시 검증 페이지
 *
 * - 로그인 상태 표시 (RSC server client 로 세션 조회)
 * - 비회원: AuthModal 트리거 버튼
 * - 회원: 닉네임 + JWT claim is_admin 표시 + 로그아웃 버튼
 *
 * M6 에서 본격 카테고리 홈으로 교체 예정 — 지금은 인증 흐름 단독 검증용.
 */

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ensureAppUserExists } from '@/lib/auth/ensure-app-user';
import { PageEvents } from '@/components/analytics/PageEvents';
import { LoginButtons } from './_components/login-buttons';
import { SignedInPanel } from './_components/signed-in-panel';

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const authError = getFirstParam(resolvedSearchParams?.auth_error);
  const supabase = await getSupabaseServerClient();

  // 세션 + 사용자 정보 조회
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // R-08 fallback — handle_new_user trigger 가 silent 실패한 경우 자동 보강 (RPC ensure_app_user_self)
  if (user) await ensureAppUserExists();

  // app_users row (handle_new_user trigger 자동 생성 검증)
  let appUser: { nickname: string; role: string; avatar_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from('app_users')
      .select('nickname, role, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    appUser = data;
  }

  // JWT 에서 is_admin claim 확인 (Custom Access Token Hook 동작 검증)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAdminClaim = parseAdminClaim(session?.access_token ?? null);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <PageEvents
        events={[
          { type: 'page_view', pathname: '/' },
          { type: 'list_view', list_kind: 'home', count: 0 },
        ]}
      />
      <h1 className="text-2xl font-bold">맛잘알</h1>
      <p className="mt-2 text-sm text-gray-600">
        프랜차이즈 메뉴와 꿀조합 위키. 곧 만나요.
      </p>
      <p className="mt-1 text-xs text-gray-400">v0.1.0 · M2 인증 검증 페이지</p>

      {authError ? (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-semibold">OAuth 로그인 실패</p>
          <p className="mt-1 break-words">{authError}</p>
        </div>
      ) : null}

      <div className="mt-8">
        {user ? (
          <SignedInPanel
            email={user.email ?? '(이메일 없음)'}
            provider={(user.app_metadata?.provider as string) ?? '?'}
            appUser={appUser}
            isAdminClaim={isAdminClaim}
          />
        ) : (
          <LoginButtons />
        )}
      </div>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  return first.slice(0, 500);
}

/**
 * JWT access_token 의 payload 에서 is_admin claim 만 꺼낸다.
 * middleware 의 parseJwtClaims 와 동일 로직 (검증 목적이라 외부 lib 회피).
 */
function parseAdminClaim(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString();
    const claims = JSON.parse(decoded) as Record<string, unknown>;
    return typeof claims.is_admin === 'string' ? claims.is_admin : null;
  } catch {
    return null;
  }
}
