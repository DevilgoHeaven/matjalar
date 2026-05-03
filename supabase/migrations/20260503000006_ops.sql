-- ===================================================================
-- 0006_ops.sql
-- 운영/통계: combo_stats / crawler_runs / catalog_change_logs / reports
-- ===================================================================

-- ===================================================================
-- combo_stats — 캐시 통계 (RPC update_combo_stats 가 갱신, R-03)
-- 1:1 with combos
-- ===================================================================
create table public.combo_stats (
  combo_id        uuid primary key references public.combos(id) on delete cascade,
  vote_count      integer not null default 0 check (vote_count >= 0),
  bookmark_count  integer not null default 0 check (bookmark_count >= 0),
  review_count    integer not null default 0 check (review_count >= 0),
  -- 평균 평점 (review insert/update 시 갱신)
  average_rating  numeric(3, 2) not null default 0
                  check (average_rating >= 0 and average_rating <= 5),
  -- 인기도 점수 (간단 가중합: vote*1 + bookmark*2 + review*3, 시간 감쇠는 v1.5)
  hot_score       integer not null default 0,
  view_count      integer not null default 0 check (view_count >= 0),
  updated_at      timestamptz not null default now()
);

comment on table public.combo_stats is 'PRD §7 combo_stats — RPC update_combo_stats 가 카운터 atomic 갱신 (R-03)';

create index combo_stats_hot_score_idx on public.combo_stats (hot_score desc);

-- 새 조합 INSERT 시 stats row 자동 생성
create or replace function public.create_combo_stats_on_combo_insert()
returns trigger
language plpgsql
as $$
begin
  insert into public.combo_stats (combo_id) values (new.id)
  on conflict (combo_id) do nothing;
  return new;
end;
$$;

create trigger create_combo_stats_after_combo_insert
  after insert on public.combos
  for each row execute function public.create_combo_stats_on_combo_insert();

-- ===================================================================
-- crawler_runs — 크롤러 실행 로그 (v2.1 v1 으로 이동)
-- v1 운영 중에는 비어있음 (크롤러는 별도 repo, M9 이후)
-- ===================================================================
create table public.crawler_runs (
  id              uuid primary key default gen_random_uuid(),
  -- 'subway_freshInfo', 'subway_menuList_sandwich' 등
  source_name     text not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running'
                  check (status in ('running', 'success', 'failed', 'partial')),
  fetched_count   integer not null default 0,
  changed_count   integer not null default 0,
  error_message   text
);

create index crawler_runs_started_at_idx on public.crawler_runs (started_at desc);

-- ===================================================================
-- catalog_change_logs — 크롤러 변경 이력 (관리자 승인 큐)
-- ===================================================================
create table public.catalog_change_logs (
  id              uuid primary key default gen_random_uuid(),
  crawler_run_id  uuid references public.crawler_runs(id) on delete set null,
  brand_id        uuid references public.brands(id) on delete set null,
  -- 대상 종류
  target_type     text not null
                  check (target_type in ('menu', 'option_group', 'option_item', 'menu_variant')),
  external_id     text,
  -- 변경 종류
  change_type     text not null
                  check (change_type in ('created', 'updated', 'missing', 'selector_error')),
  before_data     jsonb,
  after_data      jsonb,
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'ignored')),
  created_at      timestamptz not null default now()
);

create index catalog_change_logs_status_idx on public.catalog_change_logs (status, created_at);

-- ===================================================================
-- reports — 신고 (조합/후기)
-- ===================================================================
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  -- 신고 대상 종류
  target_type   text not null check (target_type in ('combo', 'review')),
  target_id     uuid not null,
  -- 신고자 (익명 신고 불가, 회원만)
  user_id       uuid not null references public.app_users(id) on delete cascade,
  reason        text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'resolved', 'ignored')),
  -- 처리한 관리자
  resolved_by   uuid references public.app_users(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at);
