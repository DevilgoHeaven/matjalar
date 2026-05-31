-- ===================================================================
-- 0001_init.sql
-- 카탈로그 기반 테이블 (categories, brands, menus, menu_variants) + 확장 활성화
-- v2.1+v2.2 PRD §7 카탈로그 6개 중 4개 (option_*은 0002 에서)
-- ===================================================================

-- 익스텐션 활성화 (Supabase Cloud 에서 이미 enabled 인 것 IF NOT EXISTS 로 안전)
create extension if not exists pgcrypto;       -- gen_random_uuid()
create extension if not exists "uuid-ossp";    -- 호환용
create extension if not exists pgroonga;       -- 한국어 검색 (R-02)

-- ===================================================================
-- categories — 7개 카테고리 (패스트푸드/카페디저트/치킨/피자/분식/뷔페/편의점)
-- ===================================================================
create table public.categories (
  -- 영문 키 (snake_case) — events_type, eslint 규칙과 일관성 유지
  id          text primary key,
  -- 한국어 라벨 (UI 노출용)
  label       text not null,
  -- 카테고리 식별 이모지 (PRD §12 v1 이미지 없음 — 이모지로 차별화)
  emoji       text not null,
  -- v1 활성 여부 (active brand 가 있을 때만 true)
  is_active   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on table  public.categories is '7개 카테고리 (패스트푸드/카페디저트/치킨/피자/분식/뷔페/편의점)';
comment on column public.categories.id is '영문 키 — packages/ui/tokens/categories.ts CategoryKey 와 동일';

-- ===================================================================
-- brands — 서브웨이/공차/스벅 등
-- ===================================================================
create table public.brands (
  id              uuid primary key default gen_random_uuid(),
  category_id     text not null references public.categories(id) on delete restrict,
  -- 영문 슬러그 (URL 경로용, 예: 'subway')
  slug            text not null unique,
  -- 한국어 이름 (UI 노출, 예: '서브웨이')
  name            text not null,
  -- v1 활성 여부 (서브웨이만 true)
  is_active       boolean not null default false,
  -- 출시 상태 — v2.2 launch_status (planned/active/hidden)
  launch_status   text not null default 'planned'
                  check (launch_status in ('planned', 'active', 'hidden')),
  -- 검수일 (메뉴 가격 마지막 매장 검증)
  last_verified_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.brands is '브랜드 (v1 은 서브웨이만 active, 나머지는 launch_status=planned)';

-- ===================================================================
-- menus — 메뉴 마스터
-- ===================================================================
create table public.menus (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brands(id) on delete cascade,
  -- 외부 식별자 (서브웨이 menuItemIdx 등)
  external_id   text,
  -- 한국어 메뉴명 (예: 'BMT', '블랙밀크티')
  name          text not null,
  -- 영문 슬러그 (선택, URL 노출 시 사용)
  slug          text,
  -- 메뉴 분류 (sandwich, salad, drink 등)
  category_kind text,
  -- 메뉴 상태 — active/discontinued/seasonal/unknown
  status        text not null default 'active'
                check (status in ('active', 'discontinued', 'seasonal', 'unknown')),
  -- 출처 URL (공홈 링크, 마지막 동기화 시점)
  source_url    text,
  last_synced_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- 같은 브랜드 안에서 external_id 는 유일
  unique (brand_id, external_id)
);

comment on table public.menus is 'PRD §7 menus — 브랜드별 메뉴 마스터';
comment on column public.menus.external_id is '서브웨이 menuItemIdx 등 외부 시스템 식별자 (크롤러 매칭용)';

-- ===================================================================
-- menu_variants — 메뉴의 사이즈/형태 변형 (v2.1 신규)
-- v2.2 Patch 1: 세트 여부는 옵션 그룹으로, variants 는 사이즈/형태만
-- ===================================================================
create table public.menu_variants (
  id           uuid primary key default gen_random_uuid(),
  menu_id      uuid not null references public.menus(id) on delete cascade,
  -- 변형 이름 (예: '15cm', '30cm', '샐러드', '단품')
  name         text not null,
  -- 변형의 기본 가격 (KRW 정수, price_status='approx' 가 대부분 v1)
  base_price   integer not null check (base_price >= 0),
  -- 카드 요약 시 기본값으로 사용할 변형
  is_default   boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),

  unique (menu_id, name)
);

comment on table public.menu_variants is 'PRD §7 v2.1 menu_variants — 메뉴의 사이즈/형태 변형 (15cm/30cm/샐러드 등)';

-- ===================================================================
-- 갱신 시각 트리거 (DRY)
-- ===================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_brands  before update on public.brands
  for each row execute function public.set_updated_at();

create trigger set_updated_at_menus   before update on public.menus
  for each row execute function public.set_updated_at();
