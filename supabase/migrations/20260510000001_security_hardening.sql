-- ===================================================================
-- 20260510000001_security_hardening.sql
-- 4-Agent + WebSearch 종합 검토 (2026-05-08) 보강 — plan §18.5 즉시 항목
--
-- 다음 4건을 단일 마이그레이션으로 묶어 db:push 1회로 적용.
-- 기존 0001~0011 마이그레이션은 그대로 보존 (history 무결성).
-- ===================================================================

-- ===================================================================
-- 1. R-22 — events.payload 크기 제한
-- 위협: anon key 가 공개되므로 공격자가 무제한 INSERT 로 free tier 500MB
--       DB 를 수 시간 내 소진 가능 → 서비스 전면 중단.
-- 완화: 단일 row payload 4KB cap (검증된 EventDescriptor 는 보통 ~200B 수준).
-- ===================================================================
alter table public.events
  add constraint events_payload_size_check
  check (pg_column_size(payload) < 4096);

comment on constraint events_payload_size_check on public.events is
  'R-22: anon INSERT 폭주 방어 — payload 4KB cap. EventDescriptor 평균 ~200B';

-- ===================================================================
-- 2. 0011 set_admin_claim — search_path 에 pg_temp 추가
-- 근거: Postgres 공식 보안 가이드 — SECURITY DEFINER 함수는
--       search_path 에 pg_temp 를 명시해야 임시 객체 hijack 회피.
-- ===================================================================
alter function public.set_admin_claim(jsonb)
  set search_path = public, pg_temp;

-- ===================================================================
-- 3. supabase_auth_admin schema USAGE 명시
-- 근거: Supabase 공식 Custom Access Token Hook 가이드 권장 패턴.
--       (현재 Hook 동작 중이지만 명시적 USAGE 부여로 미래 변경 시 안전)
-- ===================================================================
grant usage on schema public to supabase_auth_admin;

-- ===================================================================
-- 4. R-06 — handle_new_user NFC normalize 적용
-- Agent A 발견: 0004:78-79 주석만 있고 실제 NFC 변환 로직 없음.
-- Postgres 13+ normalize(text, form) 표준 함수 사용 (Supabase 는 15+).
-- 기존 trigger EXCEPTION WHEN OTHERS 가 폴백 보장.
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

  -- R-06: NFC 정규화 (Postgres 13+ 표준 함수)
  -- 한글 NFD/NFC 분리로 인한 검색 누락·dedup 실패 방지
  resolved_nickname := normalize(resolved_nickname, NFC);

  insert into public.app_users (id, nickname, avatar_url, role, status)
  values (
    new.id,
    resolved_nickname,
    resolved_avatar,
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
  'PRD §4 첫 로그인 시 app_users 자동 생성 (R-08, R-18). NFC 정규화 적용 (R-06). SECURITY DEFINER + search_path = public, auth, pg_temp';

-- ===================================================================
-- 5. R-08 fallback — ensure_app_user_self RPC
-- 위협: handle_new_user trigger 가 silent 실패 시 app_users row 누락 →
--       회원 IUD 작업이 RLS 에서 모두 차단되어 사용자가 어떤 인터랙션도 못함.
-- 완화: 본인 (auth.uid()) row 누락 시 RSC 진입 시점에 fallback 보장.
--       SECURITY DEFINER 로 RLS 우회하되, where au.id = auth.uid() 로
--       본인 외 row 생성 차단 — service_role 노출 회피 (R-04 호환).
-- ===================================================================
create or replace function public.ensure_app_user_self()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  -- auth.uid() 가 NULL 이면 (비회원) no-op
  if auth.uid() is null then
    return;
  end if;

  insert into public.app_users (id, nickname, avatar_url, role, status)
  select
    au.id,
    -- handle_new_user 와 동일한 폴백 체인 (R-18)
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
    'user',
    'active'
  from auth.users au
  where au.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

comment on function public.ensure_app_user_self() is
  'R-08 fallback — handle_new_user trigger 실패 시 RSC 첫 진입에서 app_users 보강. auth.uid() 본인만, on conflict do nothing.';

-- 회원만 호출 가능 (anon/public 차단)
grant execute on function public.ensure_app_user_self() to authenticated;
revoke execute on function public.ensure_app_user_self() from anon, public;
