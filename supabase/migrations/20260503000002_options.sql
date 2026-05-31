-- ===================================================================
-- 0002_options.sql
-- 옵션 그룹 + 옵션 항목 (PRD §7 카탈로그 6개 중 나머지 2개)
-- ===================================================================

-- ===================================================================
-- option_groups — 빵/치즈/야채/소스/추가/세트여부 등
-- v2.2 Patch 1: '세트여부' 도 일반 option_group 으로 처리 (변형 폭발 회피)
-- ===================================================================
create table public.option_groups (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references public.brands(id) on delete cascade,
  -- 메뉴별 전용 옵션이면 menu_id 지정, 브랜드 공통이면 NULL
  menu_id         uuid references public.menus(id) on delete cascade,
  -- 그룹 이름 (한국어, 예: '빵 종류', '소스', '세트여부')
  name            text not null,
  -- 단일/다중 선택
  selection_mode  text not null default 'single'
                  check (selection_mode in ('single', 'multiple')),
  -- 옵션 역할 — include(기본 선택)/exclude(빼기 가능)/add(추가)/meta(세트 등 메타)
  option_role     text not null default 'include'
                  check (option_role in ('include', 'exclude', 'add', 'meta')),
  -- 최소/최대 선택 개수
  min_select      integer not null default 0 check (min_select >= 0),
  max_select      integer not null default 1 check (max_select >= min_select),
  is_required     boolean not null default false,
  -- 카드 요약에 노출할지 여부 + 우선순위
  show_in_card    boolean not null default true,
  card_priority   integer not null default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.option_groups is 'PRD §7 option_groups — 브랜드/메뉴별 옵션 그룹';
comment on column public.option_groups.option_role is 'include=기본선택, exclude=빼기, add=추가, meta=세트여부 등';

-- ===================================================================
-- option_items — 위트/슈레드/사우스웨스트 등
-- ===================================================================
create table public.option_items (
  id              uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.option_groups(id) on delete cascade,
  -- 외부 식별자 (크롤러 매칭용)
  external_id     text,
  -- 항목 이름 (한국어)
  name            text not null,
  -- 별칭 배열 (예: '사우스웨스트' aliases ['사웨'])
  -- search_text 빌드 시 포함되어 검색 매칭에 사용 (R-20)
  alias_names     text[] not null default '{}',
  -- 가격 변동 (단품 0, 세트 +2500, 베이컨 추가 +1000 등)
  price_delta     integer not null default 0,
  -- 매장 가용성
  is_available    boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  unique (option_group_id, external_id),
  unique (option_group_id, name)
);

comment on table public.option_items is 'PRD §7 option_items — 옵션 항목, alias_names 로 검색 별칭 지원';
