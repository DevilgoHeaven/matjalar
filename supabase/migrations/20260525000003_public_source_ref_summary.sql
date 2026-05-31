-- ===================================================================
-- 20260525000003_public_source_ref_summary.sql
-- 공개 출처 노출을 요약 RPC로 제한
-- ===================================================================

drop policy if exists "content_source_refs_select_public"
  on public.content_source_refs;

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
  select
    csr.target_id,
    count(*)::integer as source_count,
    max(csr.observed_at) as last_observed_at
  from public.content_source_refs csr
  where csr.target_type = p_target_type
    and p_target_type in ('brand', 'menu', 'menu_variant', 'option_item', 'combo')
    and csr.target_id = any(coalesce(p_target_ids, array[]::uuid[]))
  group by csr.target_id
$$;

revoke all on function public.get_public_source_ref_summaries(text, uuid[]) from public;
grant execute on function public.get_public_source_ref_summaries(text, uuid[])
  to anon, authenticated;

comment on function public.get_public_source_ref_summaries(text, uuid[]) is
  '공개 UI용 출처 요약. source_url/note/title 원문은 노출하지 않고 count/date만 반환';
