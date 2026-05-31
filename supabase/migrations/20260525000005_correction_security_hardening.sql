-- ===================================================================
-- 20260525000005_correction_security_hardening.sql
-- Public correction/source-summary hardening after review
-- ===================================================================

alter table public.correction_reports
  drop constraint if exists correction_reports_source_url_http_check;

alter table public.correction_reports
  add constraint correction_reports_source_url_http_check
  check (
    source_url is null
    or (
      length(source_url) <= 500
      and source_url !~ '[[:cntrl:]]'
      and source_url !~* '^https?://[^/?#@]+@'
      and source_url ~* '^https?://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]{1,5})?([/?#]|$)'
    )
  );

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

  if normalized_url is not null and (
    normalized_url ~ '[[:cntrl:]]'
    or normalized_url ~* '^https?://[^/?#@]+@'
    or normalized_url !~* '^https?://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]{1,5})?([/?#]|$)'
  ) then
    raise exception 'invalid_source_url';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_session_id)::bigint);

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
    select 1 from public.menus m where m.id = p_target_id and m.status in ('active', 'seasonal')
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

revoke all on function public.submit_correction_report(text, text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_correction_report(text, text, uuid, text, text, text)
  to service_role;

create or replace function public.get_public_source_ref_summaries(
  p_target_type text,
  p_target_ids uuid[]
)
returns table (
  target_id uuid,
  source_count integer,
  last_observed_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with requested_targets as (
    select distinct id as target_id
      from unnest(coalesce(p_target_ids, array[]::uuid[])) as requested(id)
     limit 100
  )
  select
    csr.target_id,
    count(*)::integer as source_count,
    max(csr.observed_at) as last_observed_at
  from public.content_source_refs csr
  join requested_targets rt on rt.target_id = csr.target_id
  where csr.target_type = p_target_type
    and cardinality(coalesce(p_target_ids, array[]::uuid[])) <= 100
    and (
      (
        p_target_type = 'combo'
        and exists (
          select 1 from public.combos c
           where c.id = csr.target_id
             and c.status = 'published'
        )
      )
      or (
        p_target_type = 'brand'
        and exists (
          select 1 from public.brands b
           where b.id = csr.target_id
             and b.is_active = true
        )
      )
      or (
        p_target_type = 'menu'
        and exists (
          select 1 from public.menus m
           where m.id = csr.target_id
             and m.status in ('active', 'seasonal')
        )
      )
      or (
        p_target_type = 'menu_variant'
        and exists (
          select 1
            from public.menu_variants mv
            join public.menus m on m.id = mv.menu_id
            join public.brands b on b.id = m.brand_id
           where mv.id = csr.target_id
             and m.status in ('active', 'seasonal')
             and b.is_active = true
        )
      )
      or (
        p_target_type = 'option_item'
        and exists (
          select 1
            from public.option_items oi
            join public.option_groups og on og.id = oi.option_group_id
            join public.brands b on b.id = og.brand_id
           where oi.id = csr.target_id
             and b.is_active = true
        )
      )
    )
  group by csr.target_id
$$;

comment on function public.get_public_source_ref_summaries(text, uuid[]) is
  '공개 UI용 출처 요약. 공개 가능한 target 에 대해서만 count/date를 반환하며 최대 100개 target만 허용';
