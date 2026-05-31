-- ===================================================================
-- 20260518000002_handle_new_user_email.sql
-- handle_new_user() 와 ensure_app_user_self() 에 이메일 폴백 체인 추가
--
-- 폴백 체인 (카카오·구글 공용):
--  1. raw_user_meta_data -> 'kakao_account' ->> 'email'  (카카오 비즈앱 + account_email scope)
--  2. raw_user_meta_data ->> 'email'                      (구글 top-level)
--  3. auth.users.email                                     (Supabase 가 자동 동기화)
--
-- 검수 전 카카오: scope account_email 을 무시하므로 1번 NULL, auth.users.email 도 미저장 가능 → NULL 로 INSERT (의도된 동작)
-- 검수 후 카카오: 사용자 동의 시 1번에서 추출, 거부 시 NULL
-- 구글: 2번 또는 3번에서 추출
--
-- 의존성: 20260518000001 (app_users.email 컬럼 추가)
-- ===================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  meta jsonb;
  resolved_nickname text;
  resolved_avatar text;
  resolved_email text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  -- R-18: 카카오/구글 nickname 추출 폴백 체인
  resolved_nickname := coalesce(
    meta -> 'kakao_account' -> 'profile' ->> 'nickname',
    meta ->> 'name',
    meta ->> 'full_name',
    meta ->> 'nickname',
    '익명'
  );

  resolved_avatar := coalesce(
    meta -> 'kakao_account' -> 'profile' ->> 'profile_image_url',
    meta ->> 'avatar_url',
    meta ->> 'picture'
  );

  -- 카카오 비즈앱 account_email 폴백 체인
  resolved_email := coalesce(
    meta -> 'kakao_account' ->> 'email',
    meta ->> 'email',
    new.email
  );

  -- R-06: NFC 정규화 (Postgres 13+ 표준 함수)
  resolved_nickname := normalize(resolved_nickname, NFC);

  insert into public.app_users (id, nickname, avatar_url, email, role, status)
  values (
    new.id,
    resolved_nickname,
    resolved_avatar,
    resolved_email,
    'user',
    'active'
  )
  on conflict (id) do nothing;

  return new;
exception when others then
  -- R-08 완화: 실패해도 auth.users commit 막지 않음
  raise warning 'handle_new_user 실패 (uid=%): %', new.id, sqlerrm;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'PRD §4 첫 로그인 시 app_users 자동 생성 (R-08, R-18). 카카오 비즈앱 account_email 대응 (이메일 폴백 체인). NFC 정규화 (R-06). SECURITY DEFINER + search_path = public, auth, pg_temp';

-- ===================================================================
-- ensure_app_user_self — R-08 fallback (trigger 실패 시 RSC 진입에서 보강)
-- email 폴백 체인 동일 적용
-- ===================================================================
create or replace function public.ensure_app_user_self()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.app_users (id, nickname, avatar_url, email, role, status)
  select
    au.id,
    normalize(coalesce(
      au.raw_user_meta_data -> 'kakao_account' -> 'profile' ->> 'nickname',
      au.raw_user_meta_data ->> 'name',
      au.raw_user_meta_data ->> 'full_name',
      au.raw_user_meta_data ->> 'nickname',
      '익명'
    ), NFC),
    coalesce(
      au.raw_user_meta_data -> 'kakao_account' -> 'profile' ->> 'profile_image_url',
      au.raw_user_meta_data ->> 'avatar_url',
      au.raw_user_meta_data ->> 'picture'
    ),
    coalesce(
      au.raw_user_meta_data -> 'kakao_account' ->> 'email',
      au.raw_user_meta_data ->> 'email',
      au.email
    ),
    'user',
    'active'
  from auth.users au
  where au.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

comment on function public.ensure_app_user_self() is
  'R-08 fallback — handle_new_user trigger 실패 시 RSC 첫 진입에서 app_users 보강. 카카오 비즈앱 account_email 폴백 포함. auth.uid() 본인만, on conflict do nothing.';

-- 권한은 기존 정책 유지 (재선언 안전)
grant execute on function public.ensure_app_user_self() to authenticated;
revoke execute on function public.ensure_app_user_self() from anon, public;
