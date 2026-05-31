-- ===================================================================
-- 20260516000001_rls_rpc_hardening.sql
-- RLS/RPC 보안 보강 (2026-05-16)
--
-- 목적:
--  1. app_users.role/status 자기 수정 기반 관리자 권한 상승 차단
--  2. pending combo 를 일반 사용자가 published 로 바꾸는 RLS 구멍 차단
--  3. SECURITY DEFINER update_combo_stats 직접 호출 기반 카운터 조작 차단
--  4. 공개 상세 페이지가 review_votes 전체 SELECT 정책에 의존하지 않도록 집계 RPC 제공
--  5. 회원 인터랙션 row 가 공개 콘텐츠에만 붙도록 RLS 보강
-- ===================================================================

-- ===================================================================
-- 1. app_users privilege hardening
-- Supabase 공식 Column Level Security 문서 기준:
-- RLS 는 "행"만 제한하므로 role/status 같은 컬럼은 별도 권한 또는 트리거로 막아야 한다.
-- ===================================================================

revoke update on table public.app_users from anon;
revoke update on table public.app_users from authenticated;
grant update (nickname, avatar_url) on table public.app_users to authenticated;

create or replace function public.prevent_app_user_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.current_app_user_is_active_admin() then
    raise exception 'app_users.role/status 는 관리자 또는 service_role 만 변경할 수 있습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_app_user_privilege_escalation_on_update
  on public.app_users;

create trigger prevent_app_user_privilege_escalation_on_update
  before update on public.app_users
  for each row execute function public.prevent_app_user_privilege_escalation();

comment on function public.prevent_app_user_privilege_escalation() is
  'RLS 컬럼 보호 보강: 일반 사용자의 role/status 자기 수정 기반 권한 상승 차단';

-- 사용자 상태는 권한 경계다. RLS 정책에서 auth.uid() 만 보지 않고
-- 현재 app_users.status='active' 까지 확인한다.
create or replace function public.current_app_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
      from public.app_users au
     where au.id = auth.uid()
       and au.status = 'active'
  )
$$;

revoke all on function public.current_app_user_is_active() from public;
grant execute on function public.current_app_user_is_active() to authenticated;

comment on function public.current_app_user_is_active() is
  '현재 JWT 사용자에 대응하는 app_users row 가 active 상태인지 RLS 에서 재사용';

create or replace function public.current_app_user_is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
      from public.app_users au
     where au.id = auth.uid()
       and au.role = 'admin'
       and au.status = 'active'
  )
$$;

revoke all on function public.current_app_user_is_active_admin() from public;
grant execute on function public.current_app_user_is_active_admin()
  to anon, authenticated;

comment on function public.current_app_user_is_active_admin() is
  'stale JWT is_admin claim 보완: 현재 DB role/status 기준 active admin 여부';

-- ===================================================================
-- 2. combo owner update policy: 새 row 도 pending 상태 유지 강제
-- PostgreSQL CREATE POLICY 문서 기준 UPDATE 는 old row USING, new row WITH CHECK 를 모두 본다.
-- ===================================================================

drop policy if exists "combos_insert_self_pending" on public.combos;
create policy "combos_insert_self_pending"
  on public.combos for insert
  to authenticated
  with check (
    creator_id = (select auth.uid())
    and status = 'pending'
    and public.current_app_user_is_active()
  );

drop policy if exists "combos_update_self_pending" on public.combos;

create policy "combos_update_self_pending"
  on public.combos for update
  to authenticated
  using (
    creator_id = (select auth.uid())
    and status = 'pending'
    and public.current_app_user_is_active()
  )
  with check (
    creator_id = (select auth.uid())
    and status = 'pending'
    and public.current_app_user_is_active()
  );

drop policy if exists "combos_delete_self_pending" on public.combos;
create policy "combos_delete_self_pending"
  on public.combos for delete
  to authenticated
  using (
    creator_id = (select auth.uid())
    and status = 'pending'
    and public.current_app_user_is_active()
  );

create or replace function public.prevent_combo_protected_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or public.current_app_user_is_active_admin() then
    return new;
  end if;

  if new.brand_id is distinct from old.brand_id
     or new.primary_menu_id is distinct from old.primary_menu_id
     or new.menu_variant_id is distinct from old.menu_variant_id
     or new.creator_id is distinct from old.creator_id
     or new.card_summary is distinct from old.card_summary
     or new.estimated_price is distinct from old.estimated_price
     or new.price_status is distinct from old.price_status
     or new.featured_review_id is distinct from old.featured_review_id
     or new.seed_comment is distinct from old.seed_comment
     or new.combo_signature is distinct from old.combo_signature
     or new.search_text is distinct from old.search_text
     or new.rejected_reason is distinct from old.rejected_reason
     or new.published_at is distinct from old.published_at then
    raise exception '조합 파생/운영 필드는 관리자 승인 경로에서만 변경할 수 있습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_combo_protected_update_on_update
  on public.combos;

create trigger prevent_combo_protected_update_on_update
  before update on public.combos
  for each row execute function public.prevent_combo_protected_update();

comment on function public.prevent_combo_protected_update() is
  'pending 조합 owner 의 파생/운영 필드 변조를 차단. 승인 액션은 service_role 으로 재계산 후 반영';

-- ===================================================================
-- 3. 회원 인터랙션은 공개 콘텐츠에만 허용
-- 클라이언트/Server Action 우회로 pending/hidden 콘텐츠에 투표·찜·후기를 붙이는 것을 차단.
-- ===================================================================

drop policy if exists "combo_options_insert_via_combo" on public.combo_options;
create policy "combo_options_insert_via_combo"
  on public.combo_options for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and exists (
      select 1 from public.combos c
      where c.id = combo_options.combo_id
        and c.creator_id = (select auth.uid())
        and c.status = 'pending'
    )
  );

drop policy if exists "combo_tags_insert_via_combo" on public.combo_tags;
create policy "combo_tags_insert_via_combo"
  on public.combo_tags for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and exists (
      select 1 from public.combos c
      where c.id = combo_tags.combo_id
        and c.creator_id = (select auth.uid())
        and c.status = 'pending'
    )
  );

drop policy if exists "reviews_insert_self" on public.reviews;
create policy "reviews_insert_self"
  on public.reviews for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and status = 'published'
    and exists (
      select 1 from public.combos c
      where c.id = reviews.combo_id
        and c.status = 'published'
    )
  );

drop policy if exists "reviews_update_self" on public.reviews;
create policy "reviews_update_self"
  on public.reviews for update
  to authenticated
  using (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and status = 'published'
  )
  with check (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and status = 'published'
    and exists (
      select 1 from public.combos c
      where c.id = reviews.combo_id
        and c.status = 'published'
    )
  );

drop policy if exists "reviews_delete_self" on public.reviews;
create policy "reviews_delete_self"
  on public.reviews for delete
  to authenticated
  using (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and status = 'published'
  );

drop policy if exists "combo_votes_insert_self" on public.combo_votes;
create policy "combo_votes_insert_self"
  on public.combo_votes for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.combos c
      where c.id = combo_votes.combo_id
        and c.status = 'published'
    )
  );

drop policy if exists "combo_votes_delete_self" on public.combo_votes;
create policy "combo_votes_delete_self"
  on public.combo_votes for delete
  to authenticated
  using (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
  );

drop policy if exists "bookmarks_insert_self" on public.bookmarks;
create policy "bookmarks_insert_self"
  on public.bookmarks for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.combos c
      where c.id = bookmarks.combo_id
        and c.status = 'published'
    )
  );

drop policy if exists "bookmarks_delete_self" on public.bookmarks;
create policy "bookmarks_delete_self"
  on public.bookmarks for delete
  to authenticated
  using (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
  );

drop policy if exists "review_votes_insert_self" on public.review_votes;
create policy "review_votes_insert_self"
  on public.review_votes for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.reviews r
      join public.combos c on c.id = r.combo_id
      where r.id = review_votes.review_id
        and r.status = 'published'
        and c.status = 'published'
    )
  );

drop policy if exists "review_votes_delete_self" on public.review_votes;
create policy "review_votes_delete_self"
  on public.review_votes for delete
  to authenticated
  using (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
  );

-- review row 의 소유자/대상 combo 는 생성 후 바뀌면 통계·무결성이 꼬인다.
create or replace function public.prevent_review_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or public.current_app_user_is_active_admin() then
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.combo_id is distinct from old.combo_id then
    raise exception 'review.user_id/combo_id 는 생성 후 변경할 수 없습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_review_identity_change_on_update
  on public.reviews;

create trigger prevent_review_identity_change_on_update
  before update on public.reviews
  for each row execute function public.prevent_review_identity_change();

comment on function public.prevent_review_identity_change() is
  'review 통계 무결성 보호: 일반 사용자의 user_id/combo_id 변경 차단';

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self"
  on public.reports for insert
  to authenticated
  with check (
    public.current_app_user_is_active()
    and user_id = (select auth.uid())
    and status = 'pending'
    and (
      (
        target_type = 'combo'
        and exists (
          select 1
            from public.combos c
           where c.id = reports.target_id
             and c.status = 'published'
        )
      )
      or (
        target_type = 'review'
        and exists (
          select 1
            from public.reviews r
            join public.combos c on c.id = r.combo_id
           where r.id = reports.target_id
             and r.status = 'published'
             and c.status = 'published'
        )
      )
    )
  );

-- ===================================================================
-- 4. review_votes SELECT 개인정보 노출 축소 + 공개 집계 RPC 제공
-- 공개 상세 페이지는 이 RPC 로 vote_count 만 읽고, row/user_id 는 직접 노출하지 않는다.
-- ===================================================================

drop policy if exists "review_votes_select_all_auth" on public.review_votes;

create policy "review_votes_select_self_or_admin"
  on public.review_votes for select
  using (
    user_id = (select auth.uid())
    or (select auth.jwt()->>'is_admin') = 'true'
  );

drop policy if exists "combo_votes_select_all_auth" on public.combo_votes;

create policy "combo_votes_select_self_or_admin"
  on public.combo_votes for select
  using (
    user_id = (select auth.uid())
    or (select auth.jwt()->>'is_admin') = 'true'
  );

create or replace function public.get_review_vote_counts(p_review_ids uuid[])
returns table(review_id uuid, vote_count integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rv.review_id, count(*)::integer as vote_count
    from public.review_votes rv
    join public.reviews r on r.id = rv.review_id
    join public.combos c on c.id = r.combo_id
   where rv.review_id = any(coalesce(p_review_ids, array[]::uuid[]))
     and r.status = 'published'
     and c.status = 'published'
   group by rv.review_id
$$;

grant execute on function public.get_review_vote_counts(uuid[]) to anon, authenticated;

comment on function public.get_review_vote_counts(uuid[]) is
  '공개 후기 따봉 수 집계. review_votes row/user_id 직접 노출 없이 count 만 반환';

-- ===================================================================
-- 4-1. events 직접 INSERT 차단 + 검증 RPC 경유
-- /api/events 가 user_id 를 서버에서 정하고, 클라이언트는 table row 를 직접 만들 수 없게 한다.
-- ===================================================================

drop policy if exists "events_insert_anyone" on public.events;
revoke insert on table public.events from anon, authenticated;

create or replace function public.insert_event(
  p_session_id text,
  p_type public.events_type,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  safe_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if p_session_id is null or length(p_session_id) < 1 or length(p_session_id) > 128 then
    raise exception 'invalid session_id';
  end if;

  if octet_length(safe_payload::text) > 4096 then
    raise exception 'event payload too large';
  end if;

  insert into public.events (user_id, session_id, type, payload)
  values (auth.uid(), p_session_id, p_type, safe_payload);
end;
$$;

revoke all on function public.insert_event(text, public.events_type, jsonb) from public;
grant execute on function public.insert_event(text, public.events_type, jsonb)
  to anon, authenticated;

comment on function public.insert_event(text, public.events_type, jsonb) is
  'events table 직접 INSERT 차단 후 /api/events 경유 RPC 로 user_id/session/payload 를 제한';

-- ===================================================================
-- 4-2. 검색은 PGroonga 인덱스를 실제로 사용하는 RPC 로 고정
-- 기존 앱 레이어 ILIKE 검색은 0007 의 pgroonga 인덱스를 타지 못한다.
-- ===================================================================

create or replace function public.search_published_combos(
  p_query text,
  p_limit integer default 50
)
returns table(
  id uuid,
  title text,
  card_summary text,
  estimated_price integer,
  price_status text,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.id,
         c.title,
         c.card_summary,
         c.estimated_price,
         c.price_status,
         c.published_at
    from public.combos c
   where c.status = 'published'
     and length(trim(coalesce(p_query, ''))) > 0
     and c.search_text &@~ public.pgroonga_query_escape(left(trim(p_query), 80))
   order by c.published_at desc nulls last
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

grant execute on function public.search_published_combos(text, integer)
  to anon, authenticated;

comment on function public.search_published_combos(text, integer) is
  'PGroonga &@~ 기반 공개 조합 검색. 앱의 ILIKE 검색을 대체해 한국어 검색 인덱스를 사용';

create or replace function public.find_similar_combos(
  p_signature text,
  p_limit integer default 3
)
returns table (
  id uuid,
  title text,
  status text,
  "voteCount" integer
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    case
      when c.status = 'pending' then '승인 대기 중인 유사 조합'
      else c.title
    end as title,
    c.status,
    coalesce(s.vote_count, 0)::integer as "voteCount"
  from public.combos c
  left join public.combo_stats s on s.combo_id = c.id
  where c.combo_signature = p_signature
    and c.status in ('published', 'pending')
  order by
    case when c.status = 'published' then 0 else 1 end,
    coalesce(s.vote_count, 0) desc,
    c.created_at desc
  limit least(greatest(coalesce(p_limit, 3), 1), 10)
$$;

revoke all on function public.find_similar_combos(text, integer) from public;
grant execute on function public.find_similar_combos(text, integer)
  to authenticated;

comment on function public.find_similar_combos(text, integer) is
  'combo_signature 기반 유사 조합 경고용 RPC. pending 조합은 제목을 노출하지 않고 존재만 알려 중복 제출을 줄인다';

-- ===================================================================
-- 4-3. stale is_admin JWT 보완
-- admin RLS 정책도 현재 DB의 role/status 를 재조회한다.
-- ===================================================================

drop policy if exists "categories_admin_iud" on public.categories;
create policy "categories_admin_iud"
  on public.categories for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "brands_admin_iud" on public.brands;
create policy "brands_admin_iud"
  on public.brands for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "menus_admin_iud" on public.menus;
create policy "menus_admin_iud"
  on public.menus for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "menu_variants_admin_iud" on public.menu_variants;
create policy "menu_variants_admin_iud"
  on public.menu_variants for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "option_groups_admin_iud" on public.option_groups;
create policy "option_groups_admin_iud"
  on public.option_groups for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "option_items_admin_iud" on public.option_items;
create policy "option_items_admin_iud"
  on public.option_items for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "tags_admin_iud" on public.tags;
create policy "tags_admin_iud"
  on public.tags for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "combos_select_published" on public.combos;
create policy "combos_select_published"
  on public.combos for select
  using (
    status = 'published'
    or creator_id = (select auth.uid())
    or public.current_app_user_is_active_admin()
  );

drop policy if exists "combos_admin_all" on public.combos;
create policy "combos_admin_all"
  on public.combos for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "combo_options_select_via_combo" on public.combo_options;
create policy "combo_options_select_via_combo"
  on public.combo_options for select
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_options.combo_id
        and (
          c.status = 'published'
          or c.creator_id = (select auth.uid())
          or public.current_app_user_is_active_admin()
        )
    )
  );

drop policy if exists "combo_options_admin_all" on public.combo_options;
create policy "combo_options_admin_all"
  on public.combo_options for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "combo_tags_select_via_combo" on public.combo_tags;
create policy "combo_tags_select_via_combo"
  on public.combo_tags for select
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_tags.combo_id
        and (
          c.status = 'published'
          or c.creator_id = (select auth.uid())
          or public.current_app_user_is_active_admin()
        )
    )
  );

drop policy if exists "combo_tags_admin_all" on public.combo_tags;
create policy "combo_tags_admin_all"
  on public.combo_tags for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "app_users_select_self_or_admin" on public.app_users;
create policy "app_users_select_self_or_admin"
  on public.app_users for select
  using (
    id = (select auth.uid())
    or public.current_app_user_is_active_admin()
  );

drop policy if exists "app_users_admin_all" on public.app_users;
create policy "app_users_admin_all"
  on public.app_users for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "reviews_select_published" on public.reviews;
create policy "reviews_select_published"
  on public.reviews for select
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or public.current_app_user_is_active_admin()
  );

drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all"
  on public.reviews for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "review_votes_select_self_or_admin" on public.review_votes;
create policy "review_votes_select_self_or_admin"
  on public.review_votes for select
  using (
    user_id = (select auth.uid())
    or public.current_app_user_is_active_admin()
  );

drop policy if exists "combo_votes_select_self_or_admin" on public.combo_votes;
create policy "combo_votes_select_self_or_admin"
  on public.combo_votes for select
  using (
    user_id = (select auth.uid())
    or public.current_app_user_is_active_admin()
  );

drop policy if exists "combo_stats_admin_iud" on public.combo_stats;
create policy "combo_stats_admin_iud"
  on public.combo_stats for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "crawler_runs_admin" on public.crawler_runs;
create policy "crawler_runs_admin"
  on public.crawler_runs for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "catalog_change_logs_admin" on public.catalog_change_logs;
create policy "catalog_change_logs_admin"
  on public.catalog_change_logs for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "reports_select_self_or_admin" on public.reports;
create policy "reports_select_self_or_admin"
  on public.reports for select
  using (
    user_id = (select auth.uid())
    or public.current_app_user_is_active_admin()
  );

drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all"
  on public.reports for all
  using (public.current_app_user_is_active_admin())
  with check (public.current_app_user_is_active_admin());

drop policy if exists "events_select_admin" on public.events;
create policy "events_select_admin"
  on public.events for select
  using (public.current_app_user_is_active_admin());

-- ===================================================================
-- 5. update_combo_stats 직접 조작 방지
-- 기존 p_delta 기반 증감은 호출자가 임의 delta 를 넣을 수 있어 exact recount 방식으로 교체.
-- ===================================================================

create or replace function public.update_combo_stats(
  p_combo uuid,
  p_kind  text,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_vote_count integer;
  next_bookmark_count integer;
  next_review_count integer;
begin
  if current_role = 'anon' or coalesce(auth.role(), '') = 'anon' then
    raise exception '익명 사용자는 combo_stats 를 갱신할 수 없습니다.';
  end if;

  if p_kind not in ('vote', 'bookmark', 'review', 'view') then
    raise exception '알 수 없는 stats kind: %', p_kind;
  end if;

  insert into public.combo_stats (combo_id) values (p_combo)
  on conflict (combo_id) do nothing;

  if p_kind = 'view' then
    if coalesce(auth.role(), '') <> 'service_role'
       and not public.current_app_user_is_active_admin() then
      raise exception 'view_count 는 관리자 또는 service_role 만 직접 갱신할 수 있습니다.';
    end if;

    update public.combo_stats
       set view_count = greatest(0, view_count + p_delta),
           updated_at = now()
     where combo_id = p_combo;
    return;
  end if;

  select count(*)::integer
    into next_vote_count
    from public.combo_votes
   where combo_id = p_combo;

  select count(*)::integer
    into next_bookmark_count
    from public.bookmarks
   where combo_id = p_combo;

  select count(*)::integer
    into next_review_count
    from public.reviews
   where combo_id = p_combo
     and status = 'published';

  update public.combo_stats
     set vote_count = next_vote_count,
         bookmark_count = next_bookmark_count,
         review_count = next_review_count,
         hot_score = greatest(
           0,
           next_vote_count + next_bookmark_count * 2 + next_review_count * 3
         ),
         updated_at = now()
   where combo_id = p_combo;
end;
$$;

revoke all on function public.update_combo_stats(uuid, text, integer) from public;
revoke all on function public.update_combo_stats(uuid, text, integer) from anon;
grant execute on function public.update_combo_stats(uuid, text, integer)
  to authenticated, service_role;

comment on function public.update_combo_stats(uuid, text, integer) is
  'R-03 보강 — 호출자 delta 를 신뢰하지 않고 원본 테이블에서 exact recount 로 combo_stats 갱신';
