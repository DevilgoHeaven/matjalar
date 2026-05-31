-- ===================================================================
-- 20260525000002_trust_corrections.sql
-- 데이터 신뢰도 출처 + 익명 가격/옵션 제보 루프
-- ===================================================================

alter type public.events_type add value if not exists 'correction_submit';

create table public.content_source_refs (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null
                check (target_type in ('brand', 'menu', 'menu_variant', 'option_item', 'combo')),
  target_id     uuid not null,
  source_kind   text not null
                check (source_kind in ('official', 'operator_check', 'community', 'news', 'price_tracker')),
  confidence    text not null default 'unverified'
                check (confidence in ('confirmed', 'approx', 'unverified')),
  price_status  text not null default 'unknown'
                check (price_status in ('exact', 'approx', 'unknown')),
  title         text not null,
  source_url    text,
  observed_at   timestamptz not null default now(),
  note          text,
  created_by    uuid references public.app_users(id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint content_source_refs_exact_requires_strong_source
    check (price_status <> 'exact' or source_kind in ('official', 'operator_check'))
);

comment on table public.content_source_refs is
  '브랜드/메뉴/옵션/조합별 출처와 가격 신뢰도. exact 가격은 official/operator_check 출처에서만 허용';
comment on column public.content_source_refs.target_type is
  'polymorphic target: brand/menu/menu_variant/option_item/combo';
comment on column public.content_source_refs.confidence is
  'confirmed=확인됨, approx=추정 근거 있음, unverified=운영 검증 전';

create index content_source_refs_target_idx
  on public.content_source_refs (target_type, target_id, observed_at desc);
create index content_source_refs_confidence_idx
  on public.content_source_refs (confidence, observed_at desc);
create index content_source_refs_source_kind_idx
  on public.content_source_refs (source_kind, observed_at desc);

alter table public.content_source_refs enable row level security;

create policy "content_source_refs_admin_all"
  on public.content_source_refs for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

create table public.correction_reports (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null check (length(session_id) >= 1 and length(session_id) <= 128),
  target_type   text not null check (target_type in ('combo', 'brand', 'menu')),
  target_id     uuid not null,
  report_kind   text not null
                check (report_kind in ('price', 'sold_out', 'option_changed', 'combo_feedback')),
  note          varchar(280),
  source_url    text check (
                source_url is null or source_url ~* '^https?://'
              ),
  status        text not null default 'pending'
                check (status in ('pending', 'resolved', 'ignored')),
  resolved_by   uuid references public.app_users(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.correction_reports is
  '비회원도 가능한 가격/품절/옵션 변경 제보. 공개 데이터 직접 수정 없이 관리자 검토만 생성';
comment on column public.correction_reports.session_id is
  'mzr_sid 기반 일일 제출 cap 적용 대상';

create index correction_reports_status_idx
  on public.correction_reports (status, created_at asc);
create index correction_reports_session_idx
  on public.correction_reports (session_id, created_at desc);
create index correction_reports_target_idx
  on public.correction_reports (target_type, target_id, created_at desc);

alter table public.correction_reports enable row level security;

create policy "correction_reports_admin_all"
  on public.correction_reports for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

create or replace function public.submit_correction_report(
  p_session_id text,
  p_target_type text,
  p_target_id uuid,
  p_report_kind text,
  p_note text default null,
  p_source_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  report_id uuid;
  recent_count integer;
  normalized_note text := nullif(left(trim(coalesce(p_note, '')), 280), '');
  normalized_url text := nullif(left(trim(coalesce(p_source_url, '')), 500), '');
begin
  if p_session_id is null or length(p_session_id) < 1 or length(p_session_id) > 128 then
    raise exception 'invalid_session_id';
  end if;

  if p_target_type not in ('combo', 'brand', 'menu') then
    raise exception 'invalid_target_type';
  end if;

  if p_report_kind not in ('price', 'sold_out', 'option_changed', 'combo_feedback') then
    raise exception 'invalid_report_kind';
  end if;

  if normalized_url is not null and normalized_url !~* '^https?://' then
    raise exception 'invalid_source_url';
  end if;

  select count(*)::integer
    into recent_count
    from public.correction_reports cr
   where cr.session_id = p_session_id
     and cr.created_at >= now() - interval '24 hours';

  if recent_count >= 5 then
    raise exception 'too_many_correction_reports';
  end if;

  if p_target_type = 'combo' and not exists (
    select 1 from public.combos c where c.id = p_target_id and c.status = 'published'
  ) then
    raise exception 'target_not_found';
  end if;

  if p_target_type = 'brand' and not exists (
    select 1 from public.brands b where b.id = p_target_id and b.is_active = true
  ) then
    raise exception 'target_not_found';
  end if;

  if p_target_type = 'menu' and not exists (
    select 1 from public.menus m where m.id = p_target_id and m.status = 'active'
  ) then
    raise exception 'target_not_found';
  end if;

  insert into public.correction_reports (
    session_id,
    target_type,
    target_id,
    report_kind,
    note,
    source_url
  )
  values (
    p_session_id,
    p_target_type,
    p_target_id,
    p_report_kind,
    normalized_note,
    normalized_url
  )
  returning id into report_id;

  return report_id;
end;
$$;

revoke all on function public.submit_correction_report(text, text, uuid, text, text, text) from public;
grant execute on function public.submit_correction_report(text, text, uuid, text, text, text)
  to anon, authenticated;

comment on function public.submit_correction_report(text, text, uuid, text, text, text) is
  '익명 제보 생성 RPC. RLS table insert 를 열지 않고 target 검증과 session 일일 cap 을 적용';
