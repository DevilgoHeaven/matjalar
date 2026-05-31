-- ===================================================================
-- 20260525000004_correction_url_guard.sql
-- correction_reports source_url DB 레벨 http/https 제한
-- ===================================================================

alter table public.correction_reports
  drop constraint if exists correction_reports_source_url_http_check;

alter table public.correction_reports
  add constraint correction_reports_source_url_http_check
  check (source_url is null or source_url ~* '^https?://');

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
