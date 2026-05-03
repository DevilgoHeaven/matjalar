-- ===================================================================
-- 0011_admin_claim_hook.sql
-- Custom Access Token Hook 함수 (M2)
--
-- Supabase Auth 가 access token 발급 직전에 본 함수를 호출.
-- app_users.role = 'admin' 이면 JWT claim "is_admin": "true" 추가.
-- RLS 정책의 auth.jwt()->>'is_admin' = 'true' 가 동작하려면 필수 (R-09).
--
-- 등록 방법 (Supabase Dashboard > Authentication > Auth Hooks):
--   1. 본 마이그레이션 push 후
--   2. Custom Access Token Hook 카드 → Enable
--   3. Postgres function 선택 → public.set_admin_claim
--   4. Save
-- ===================================================================

create or replace function public.set_admin_claim(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  user_status text;
  claims jsonb;
begin
  -- event 구조: { user_id: uuid, claims: jsonb, ... } (Supabase Auth Hook 스펙)
  -- 안전한 키 경로 — event 가 비정상이면 그대로 반환
  if event is null or event ? 'user_id' = false then
    return event;
  end if;

  -- 해당 사용자의 role / status 조회
  select au.role, au.status into user_role, user_status
    from public.app_users au
   where au.id = (event ->> 'user_id')::uuid;

  -- 기본 claims (없을 경우 빈 객체)
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  -- role=admin && status=active 인 경우만 is_admin=true
  if user_role = 'admin' and user_status = 'active' then
    claims := jsonb_set(claims, '{is_admin}', '"true"'::jsonb, true);
  else
    -- 명시적 false (claim 자체를 false 값으로 박아 RLS 의도 명확화)
    claims := jsonb_set(claims, '{is_admin}', '"false"'::jsonb, true);
  end if;

  -- app_users.role 자체도 claim 으로 노출 (선택, 클라이언트가 UI 분기 시 사용 가능)
  if user_role is not null then
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role), true);
  end if;

  -- 갱신된 claims 반환
  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

comment on function public.set_admin_claim(jsonb) is
  'Custom Access Token Hook — JWT 에 is_admin / app_role claim 추가 (R-09 재귀 회피)';

-- Auth Hook 실행 권한 — supabase_auth_admin 만 호출 가능
grant execute on function public.set_admin_claim(jsonb) to supabase_auth_admin;

-- 일반 사용자 권한 회수 (보안)
revoke execute on function public.set_admin_claim(jsonb) from authenticated, anon, public;
