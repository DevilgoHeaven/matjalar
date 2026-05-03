-- ===================================================================
-- 0007_indexes.sql
-- 검색·정렬용 인덱스 (PGroonga 한국어 + b-tree)
-- R-02: pg_trgm 폐기, PGroonga 사용 (한국어 형태소)
-- R-20: combos.search_text 는 등록 시 alias 포함 빌드
-- ===================================================================

-- PGroonga 인덱스 — 한국어 검색의 핵심
-- 사용 예: WHERE search_text &@~ '사웨'
-- &@~ 연산자: 자연어 검색 (Groonga 토큰화)
create index combos_search_text_pgroonga_idx
  on public.combos using pgroonga (search_text);

-- 메뉴명 검색 (브랜드 페이지 인기 탭에서 메뉴 이름으로 빠른 매칭)
create index menus_name_pgroonga_idx
  on public.menus using pgroonga (name);

-- 옵션 항목 별칭 검색 (검색 시 alias 매칭 보조)
create index option_items_alias_gin_idx
  on public.option_items using gin (alias_names);

-- combos.title 도 PGroonga (제목으로 검색)
create index combos_title_pgroonga_idx
  on public.combos using pgroonga (title);

-- 조합 작성자 별 인덱스 (등록 폼에서 본인 등록 이력 조회)
create index combos_creator_idx on public.combos (creator_id, created_at desc);

-- 카테고리 별 브랜드 조회 (홈)
create index brands_category_active_idx
  on public.brands (category_id, is_active);

-- 메뉴 별 변형 조회 (등록 폼에서 사이즈 선택)
create index menu_variants_menu_idx on public.menu_variants (menu_id, sort_order);

-- 옵션 그룹 별 항목 조회 (등록 폼에서 칩 UI 빌드)
create index option_groups_brand_menu_idx
  on public.option_groups (brand_id, menu_id, sort_order);

create index option_items_group_idx
  on public.option_items (option_group_id, sort_order);
