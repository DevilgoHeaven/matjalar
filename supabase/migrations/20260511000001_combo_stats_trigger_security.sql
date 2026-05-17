-- ===================================================================
-- 20260511000001_combo_stats_trigger_security.sql
-- combo INSERT 트리거가 RLS 이후에도 stats row 를 만들 수 있게 보정
-- ===================================================================

create or replace function public.create_combo_stats_on_combo_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.combo_stats (combo_id) values (new.id)
  on conflict (combo_id) do nothing;
  return new;
end;
$$;

comment on function public.create_combo_stats_on_combo_insert() is
  'combo insert 후 combo_stats row 생성. RLS 적용 후 회원 pending combo 등록이 막히지 않도록 SECURITY DEFINER 사용';
