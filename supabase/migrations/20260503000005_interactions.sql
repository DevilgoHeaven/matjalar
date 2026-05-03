-- ===================================================================
-- 0005_interactions.sql
-- 사용자 인터랙션: reviews / review_votes / combo_votes / bookmarks
-- v2.2 Patch 2: reviews.source_type 컬럼 의도적으로 제거 (R-16)
--   → 시드 후기는 combos.seed_comment 한 곳만 사용
-- v2.2 Patch 3: reviews UNIQUE(combo_id, user_id) — 한 유저 한 후기만
-- ===================================================================

-- ===================================================================
-- reviews — 한 줄 후기 + 1~5 평점
-- ===================================================================
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  combo_id    uuid not null references public.combos(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  -- 1~5 점, 0.1 단위
  rating      numeric(2, 1) not null
              check (rating >= 1.0 and rating <= 5.0),
  -- 한 줄 후기 (140 자 강제 — PRD §12 자유 서술 X)
  content     varchar(140) not null,
  -- v2.2 Patch 2: source_type 컬럼 의도적으로 제거 — 시드는 combos.seed_comment 사용
  status      text not null default 'published'
              check (status in ('published', 'hidden', 'reported')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- v2.2 Patch 3: 한 유저는 한 조합에 후기 하나만 (UPSERT 로 수정 가능)
  constraint reviews_combo_user_unique unique (combo_id, user_id)
);

comment on table  public.reviews is 'PRD §7 reviews — UNIQUE(combo_id,user_id), source_type 제거 (v2.2 Patch 2)';
comment on column public.reviews.content is '한 줄 후기 140 자 강제 (PRD §12 자유 서술 금지)';

create index reviews_combo_idx       on public.reviews (combo_id);
create index reviews_user_idx        on public.reviews (user_id);
create index reviews_created_at_idx  on public.reviews (created_at desc);

create trigger set_updated_at_reviews before update on public.reviews
  for each row execute function public.set_updated_at();

-- 0003 의 combos.featured_review_id 외래키 추가
alter table public.combos
  add constraint combos_featured_review_fk foreign key (featured_review_id)
  references public.reviews(id) on delete set null;

-- ===================================================================
-- review_votes — 후기에 대한 따봉 (대표 후기 자동 선정에 사용)
-- ===================================================================
create table public.review_votes (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  created_at  timestamptz not null default now(),

  constraint review_votes_unique unique (review_id, user_id)
);

create index review_votes_review_idx on public.review_votes (review_id);

-- ===================================================================
-- combo_votes — 조합 따봉 (KPI: 따봉 클릭률)
-- ===================================================================
create table public.combo_votes (
  id          uuid primary key default gen_random_uuid(),
  combo_id    uuid not null references public.combos(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  created_at  timestamptz not null default now(),

  constraint combo_votes_unique unique (combo_id, user_id)
);

create index combo_votes_combo_idx on public.combo_votes (combo_id);

-- ===================================================================
-- bookmarks — 찜 (KPI: 찜 클릭률, 본인 찜 페이지)
-- ===================================================================
create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  combo_id    uuid not null references public.combos(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  created_at  timestamptz not null default now(),

  constraint bookmarks_unique unique (combo_id, user_id)
);

create index bookmarks_user_idx  on public.bookmarks (user_id, created_at desc);
create index bookmarks_combo_idx on public.bookmarks (combo_id);
