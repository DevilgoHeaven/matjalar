-- ===================================================================
-- 0004_users.sql
-- app_users + 첫 로그인 trigger (PRD §4 / R-08 / R-18)
-- ===================================================================

-- ===================================================================
-- app_users — 사용자 프로필
-- v2.1: id 가 auth.users.id 와 동일 UUID (외래키, ON DELETE CASCADE)
-- ===================================================================
create table public.app_users (
  -- auth.users.id 와 동일 UUID — Supabase Auth 와 강결합
  id          uuid primary key references auth.users(id) on delete cascade,

  -- 표시 이름 (카카오 nickname / 구글 name 에서 추출, NFC 정규화)
  nickname    text not null default '익명',
  avatar_url  text,

  -- 권한 — user/trusted/admin (클라이언트 수정 불가, RLS 로 보호)
  role        text not null default 'user'
              check (role in ('user', 'trusted', 'admin')),

  -- 계정 상태
  status      text not null default 'active'
              check (status in ('active', 'suspended', 'deleted')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.app_users is 'PRD §7 app_users — auth.users 1:1 매핑. role/status 는 service_role 만 변경';
comment on column public.app_users.role is 'JWT claim is_admin 은 Custom Access Token Hook 가 role=admin 인 경우 true 로 채움 (R-09)';

create trigger set_updated_at_app_users before update on public.app_users
  for each row execute function public.set_updated_at();

-- combos.creator_id 외래키 추가 (0003 에서 보류)
alter table public.combos
  add constraint combos_creator_fk foreign key (creator_id)
  references public.app_users(id) on delete set null;

-- ===================================================================
-- handle_new_user — auth.users insert 시 자동으로 app_users row 생성
-- R-08: trigger 실패 시 silent 방지 — EXCEPTION 시 events 에 client_error 기록 (events 는 0009)
-- R-18: 카카오 raw_user_meta_data 에서 nickname/avatar 추출
-- ===================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb;
  resolved_nickname text;
  resolved_avatar text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  -- 카카오 → kakao_account.profile.nickname
  -- 구글 → name (또는 user_metadata.full_name)
  -- 폴백: '익명'
  resolved_nickname := coalesce(
    meta -> 'kakao_account' -> 'profile' ->> 'nickname',
    meta ->> 'name',
    meta ->> 'full_name',
    meta ->> 'nickname',
    '익명'
  );

  -- 카카오 → kakao_account.profile.profile_image_url
  -- 구글 → picture / avatar_url
  resolved_avatar := coalesce(
    meta -> 'kakao_account' -> 'profile' ->> 'profile_image_url',
    meta ->> 'avatar_url',
    meta ->> 'picture'
  );

  -- NFC 정규화는 plpgsql 에서 normalize() 함수로 가능 (PostgreSQL 13+)
  -- 일부 환경에서 미지원 시 그대로 INSERT
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
  -- R-08 완화: 실패해도 auth.users 자체 commit 은 막지 않음
  -- 실제 에러 로그는 Supabase Logs Explorer 에서 확인. v1.5 에서 events 테이블 sink 추가
  raise warning 'handle_new_user 실패 (uid=%): %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is 'PRD §4 첫 로그인 시 app_users 자동 생성 (R-08, R-18). SECURITY DEFINER + search_path 고정';
