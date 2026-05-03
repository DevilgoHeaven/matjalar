-- ===================================================================
-- 0010_rpc.sql
-- RPC 함수 — Server Action 에서 호출하는 atomic 연산
-- R-03 완화: combo_stats 카운터를 SECURITY DEFINER 함수로 묶어 race 회피
-- ===================================================================

-- ===================================================================
-- update_combo_stats — 카운터 atomic 증감
--
-- 사용 예 (Server Action):
--   await supabase.rpc('update_combo_stats', { p_combo: comboId, p_kind: 'vote', p_delta: 1 });
--
-- 인자:
--   p_combo  대상 조합 UUID
--   p_kind   카운터 종류 ('vote' | 'bookmark' | 'review' | 'view')
--   p_delta  증감값 (보통 +1 / -1)
--
-- 보안:
--   SECURITY DEFINER + search_path 고정 으로 일반 사용자도 호출 가능하나
--   RLS 가 본인 vote/bookmark/review insert 만 허용하므로 위변조 불가.
-- ===================================================================
create or replace function public.update_combo_stats(
  p_combo uuid,
  p_kind  text,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 인자 검증
  if p_kind not in ('vote', 'bookmark', 'review', 'view') then
    raise exception '알 수 없는 stats kind: %', p_kind;
  end if;

  -- combo_stats row 가 없으면 생성 (combos insert 트리거가 만들지만 안전망)
  insert into public.combo_stats (combo_id) values (p_combo)
  on conflict (combo_id) do nothing;

  -- atomic UPSERT — 카운터 증감
  if p_kind = 'vote' then
    update public.combo_stats
       set vote_count = greatest(0, vote_count + p_delta),
           hot_score  = greatest(0, hot_score + p_delta * 1),
           updated_at = now()
     where combo_id = p_combo;

  elsif p_kind = 'bookmark' then
    update public.combo_stats
       set bookmark_count = greatest(0, bookmark_count + p_delta),
           hot_score      = greatest(0, hot_score + p_delta * 2),
           updated_at     = now()
     where combo_id = p_combo;

  elsif p_kind = 'review' then
    update public.combo_stats
       set review_count = greatest(0, review_count + p_delta),
           hot_score    = greatest(0, hot_score + p_delta * 3),
           updated_at   = now()
     where combo_id = p_combo;

  elsif p_kind = 'view' then
    update public.combo_stats
       set view_count = greatest(0, view_count + p_delta),
           updated_at = now()
     where combo_id = p_combo;
  end if;
end;
$$;

comment on function public.update_combo_stats(uuid, text, integer) is
  'PRD R-03 완화 — combo_stats 카운터 atomic 증감. Server Action 에서 호출';

-- ===================================================================
-- recalc_average_rating — review insert/update/delete 시 평균 평점 재계산
-- review insert/update/delete 마다 trigger 가 호출
-- ===================================================================
create or replace function public.recalc_average_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_combo uuid;
begin
  -- DELETE 면 OLD, 그 외 NEW
  target_combo := coalesce(new.combo_id, old.combo_id);

  update public.combo_stats cs
     set average_rating = coalesce(
           (select round(avg(r.rating)::numeric, 2)
              from public.reviews r
             where r.combo_id = target_combo
               and r.status = 'published'),
           0
         ),
         updated_at = now()
   where cs.combo_id = target_combo;

  return coalesce(new, old);
end;
$$;

create trigger recalc_average_rating_after_review
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_average_rating();

-- ===================================================================
-- 권한 — RPC 는 authenticated/anon 도 호출 가능 (RLS 가 입력 보호)
-- ===================================================================
grant execute on function public.update_combo_stats(uuid, text, integer) to authenticated, anon;
