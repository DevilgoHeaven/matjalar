-- ===================================================================
-- 0008_rls.sql
-- Row Level Security 정책 — PRD §4
--
-- 원칙:
--  - 모든 테이블에 RLS enable (default-deny)
--  - 익명 SELECT: 공개 콘텐츠만 (combos.status='published', reviews.status='published' 등)
--  - 회원 INSERT: 본인 user_id 강제 + 안전 status 만 (R-04 보강)
--  - 회원 UPDATE/DELETE: 본인 데이터만
--  - 관리자: JWT claim is_admin (Custom Access Token Hook 가 채움, R-09)
--  - service_role: 모든 RLS 자동 우회 (Supabase 동작)
--
-- WHY auth.jwt()->>'is_admin': is_admin() SQL 함수가 auth.users 셀렉트 시 재귀 가능 → claim 으로 회피
-- ===================================================================

-- ===== 카탈로그: 익명 SELECT 가능, IUD 는 admin 만 =====
alter table public.categories      enable row level security;
alter table public.brands          enable row level security;
alter table public.menus           enable row level security;
alter table public.menu_variants   enable row level security;
alter table public.option_groups   enable row level security;
alter table public.option_items    enable row level security;
alter table public.tags            enable row level security;

-- 익명·회원 SELECT 가능 (브랜드는 launch_status 무관 SELECT 허용 — UI 가 비활성 처리)
create policy "categories_select_all"     on public.categories     for select using (true);
create policy "brands_select_all"         on public.brands         for select using (true);
create policy "menus_select_active"       on public.menus          for select using (status in ('active', 'seasonal'));
create policy "menu_variants_select_all"  on public.menu_variants  for select using (true);
create policy "option_groups_select_all"  on public.option_groups  for select using (true);
create policy "option_items_select_all"   on public.option_items   for select using (is_available = true);
create policy "tags_select_all"           on public.tags           for select using (true);

-- IUD 는 admin 만 (service_role 우회, JWT claim 검증)
create policy "categories_admin_iud"      on public.categories     for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "brands_admin_iud"          on public.brands         for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "menus_admin_iud"           on public.menus          for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "menu_variants_admin_iud"   on public.menu_variants  for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "option_groups_admin_iud"   on public.option_groups  for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "option_items_admin_iud"    on public.option_items   for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "tags_admin_iud"            on public.tags           for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');

-- ===== combos / combo_options / combo_tags =====
alter table public.combos        enable row level security;
alter table public.combo_options enable row level security;
alter table public.combo_tags    enable row level security;

-- 익명 SELECT: published 만
create policy "combos_select_published"
  on public.combos for select
  using (status = 'published' or auth.jwt()->>'is_admin' = 'true' or creator_id = auth.uid());

-- 회원 INSERT: 본인 creator_id + status='pending' 만 (안전 상태 강제)
create policy "combos_insert_self_pending"
  on public.combos for insert
  to authenticated
  with check (creator_id = auth.uid() and status = 'pending');

-- 회원 UPDATE: 본인 + pending 상태에서만 수정 (관리자는 무관)
create policy "combos_update_self_pending"
  on public.combos for update
  to authenticated
  using (creator_id = auth.uid() and status = 'pending')
  with check (creator_id = auth.uid());

-- admin 전체 권한
create policy "combos_admin_all"
  on public.combos for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');

-- combo_options: 부모 combo 의 RLS 따라가기 (combo SELECT 가능하면 options 도 SELECT)
create policy "combo_options_select_via_combo"
  on public.combo_options for select
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_options.combo_id
        and (c.status = 'published' or c.creator_id = auth.uid() or auth.jwt()->>'is_admin' = 'true')
    )
  );

create policy "combo_options_insert_via_combo"
  on public.combo_options for insert
  to authenticated
  with check (
    exists (
      select 1 from public.combos c
      where c.id = combo_options.combo_id
        and c.creator_id = auth.uid()
        and c.status = 'pending'
    )
  );

create policy "combo_options_admin_all"
  on public.combo_options for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');

-- combo_tags: 동일 패턴
create policy "combo_tags_select_via_combo"
  on public.combo_tags for select
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_tags.combo_id
        and (c.status = 'published' or c.creator_id = auth.uid() or auth.jwt()->>'is_admin' = 'true')
    )
  );

create policy "combo_tags_insert_via_combo"
  on public.combo_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.combos c
      where c.id = combo_tags.combo_id
        and c.creator_id = auth.uid()
        and c.status = 'pending'
    )
  );

create policy "combo_tags_admin_all"
  on public.combo_tags for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');

-- ===== app_users =====
alter table public.app_users enable row level security;

-- 본인 + admin SELECT
create policy "app_users_select_self_or_admin"
  on public.app_users for select
  using (id = auth.uid() or auth.jwt()->>'is_admin' = 'true');

-- 본인 nickname/avatar 만 UPDATE (role/status 는 admin 만)
create policy "app_users_update_self_profile"
  on public.app_users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "app_users_admin_all"
  on public.app_users for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');

-- ===== reviews / review_votes / combo_votes / bookmarks =====
alter table public.reviews        enable row level security;
alter table public.review_votes   enable row level security;
alter table public.combo_votes    enable row level security;
alter table public.bookmarks      enable row level security;

-- reviews: published 익명 SELECT, 본인 IUD, admin 전체
create policy "reviews_select_published"
  on public.reviews for select
  using (status = 'published' or user_id = auth.uid() or auth.jwt()->>'is_admin' = 'true');

create policy "reviews_insert_self"
  on public.reviews for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'published');

create policy "reviews_update_self"
  on public.reviews for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reviews_delete_self"
  on public.reviews for delete
  to authenticated
  using (user_id = auth.uid());

create policy "reviews_admin_all"
  on public.reviews for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');

-- review_votes / combo_votes / bookmarks: 본인만 IUD, SELECT 는 인증된 모든 사용자 (집계 쿼리에 필요)
create policy "review_votes_select_all_auth"
  on public.review_votes for select
  using (auth.uid() is not null or auth.jwt()->>'is_admin' = 'true');

create policy "review_votes_insert_self"
  on public.review_votes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "review_votes_delete_self"
  on public.review_votes for delete
  to authenticated
  using (user_id = auth.uid());

create policy "combo_votes_select_all_auth"
  on public.combo_votes for select
  using (auth.uid() is not null or auth.jwt()->>'is_admin' = 'true');

create policy "combo_votes_insert_self"
  on public.combo_votes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "combo_votes_delete_self"
  on public.combo_votes for delete
  to authenticated
  using (user_id = auth.uid());

-- bookmarks: SELECT 는 본인만 (개인 정보)
create policy "bookmarks_select_self"
  on public.bookmarks for select
  to authenticated
  using (user_id = auth.uid());

create policy "bookmarks_insert_self"
  on public.bookmarks for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bookmarks_delete_self"
  on public.bookmarks for delete
  to authenticated
  using (user_id = auth.uid());

-- ===== combo_stats — 익명 SELECT 가능, IUD 는 RPC 함수 (SECURITY DEFINER) 만 =====
alter table public.combo_stats enable row level security;

create policy "combo_stats_select_all"
  on public.combo_stats for select using (true);

-- INSERT/UPDATE/DELETE 는 RPC update_combo_stats(SECURITY DEFINER) 가 우회 (R-03)
-- admin 도 직접 수정 가능
create policy "combo_stats_admin_iud"
  on public.combo_stats for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');

-- ===== crawler_runs / catalog_change_logs — admin 만 =====
alter table public.crawler_runs        enable row level security;
alter table public.catalog_change_logs enable row level security;

create policy "crawler_runs_admin"          on public.crawler_runs        for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');
create policy "catalog_change_logs_admin"   on public.catalog_change_logs for all using (auth.jwt()->>'is_admin' = 'true') with check (auth.jwt()->>'is_admin' = 'true');

-- ===== reports — 회원 INSERT 본인, SELECT/관리는 admin =====
alter table public.reports enable row level security;

create policy "reports_insert_self"
  on public.reports for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "reports_select_self_or_admin"
  on public.reports for select
  using (user_id = auth.uid() or auth.jwt()->>'is_admin' = 'true');

create policy "reports_admin_all"
  on public.reports for all
  using (auth.jwt()->>'is_admin' = 'true')
  with check (auth.jwt()->>'is_admin' = 'true');
