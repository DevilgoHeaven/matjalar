/**
 * ensureAppUserExists — R-08 fallback
 *
 * handle_new_user trigger 가 silent 실패한 경우 (auth.users 는 생성됐는데
 * app_users row 가 없는 상태) RSC 진입 시점에 app_users 를 자동 보강한다.
 *
 * 동작:
 *  1. session 없으면 no-op
 *  2. app_users 본인 row 존재 → no-op
 *  3. 누락 시 RPC `public.ensure_app_user_self()` 호출
 *     - SECURITY DEFINER + auth.uid() 본인만, on conflict do nothing
 *     - service_role 노출 X (R-04 호환)
 *
 * 호출 위치: app/page.tsx 등 회원 진입 RSC 의 첫 번째 user 분기.
 */

import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 본인 app_users row 존재 보장. 누락 시 RPC 로 보강.
 *
 * @returns boolean — true 면 row 가 (이미 또는 보강 후) 존재
 */
export async function ensureAppUserExists(): Promise<boolean> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // 1. 빠른 경로 — 이미 존재하면 즉시 종료
  const { data: existing, error: selectError } = await supabase
    .from('app_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    // RLS 거부 등 — fallback RPC 시도
    console.warn('[ensureAppUserExists] select 실패:', selectError.message);
  }

  if (existing) return true;

  // 2. fallback — SECURITY DEFINER RPC 호출
  // (ensure_app_user_self 는 보강 마이그레이션 20260510000001 의 RPC)
  const { error: rpcError } = await supabase.rpc('ensure_app_user_self');
  if (rpcError) {
    // M8 events client_error sink 으로 갱신 예정
    console.error('[ensureAppUserExists] RPC 실패:', rpcError.message);
    return false;
  }

  return true;
}
