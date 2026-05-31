-- ===================================================================
-- supabase/seed.sql — 옵션·메뉴 마스터 시드 (M1)
--
-- 자동 실행: `supabase db reset` 시 마이그레이션 적용 후 본 파일 실행
-- 멱등(idempotent) — ON CONFLICT 로 반복 실행 가능
--
-- 60 개 조합은 /admin/seed UI 에서 (M5 폼 재사용 + adminOverride)
-- ===================================================================

-- ===== 카테고리 (PRD §5 v1: fastfood 만 active) =====
insert into public.categories (id, label, emoji, is_active, sort_order) values
  ('fastfood',    '패스트푸드',  '🍔', true,  10),
  ('cafedessert', '카페·디저트', '☕', false, 20),
  ('chicken',     '치킨',       '🍗', false, 30),
  ('pizza',       '피자',       '🍕', false, 40),
  ('bunsik',      '분식',       '🍜', false, 50),
  ('buffet',      '뷔페',       '🍽️', false, 60),
  ('cvs',         '편의점',     '🏪', false, 70)
on conflict (id) do update
   set label      = excluded.label,
       emoji      = excluded.emoji,
       is_active  = excluded.is_active,
       sort_order = excluded.sort_order;

-- ===== 브랜드 — 서브웨이만 v1 active =====
insert into public.brands (id, category_id, slug, name, is_active, launch_status) values
  ('00000000-0000-0000-0000-000000000001', 'fastfood', 'subway', '서브웨이', true, 'active')
on conflict (slug) do update
   set name          = excluded.name,
       is_active     = excluded.is_active,
       launch_status = excluded.launch_status;

-- ===== 메뉴 (서브웨이 — 출시 최소 30 개, 시드는 인기 5 개만 / 나머지 크롤러 또는 /admin/seed) =====
insert into public.menus (id, brand_id, external_id, name, slug, category_kind, status, source_url) values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '1', 'BMT', 'bmt', 'sandwich', 'active',
   'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=1'),
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '2', '치킨 데리야끼', 'chicken-teriyaki', 'sandwich', 'active',
   'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=2'),
  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '3', '서브웨이 클럽', 'subway-club', 'sandwich', 'active',
   'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=3'),
  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '4', '터키 베이컨 아보카도', 'turkey-bacon-avocado', 'sandwich', 'active',
   'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=4'),
  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   '5', '에그마요', 'egg-mayo', 'sandwich', 'active',
   'https://www.subway.co.kr/menuView/sandwich?menuItemIdx=5')
on conflict (brand_id, external_id) do update
   set name          = excluded.name,
       slug          = excluded.slug,
       status        = excluded.status,
       source_url    = excluded.source_url;

-- ===== 메뉴 변형 (15cm / 30cm / 샐러드) — 출시 전 매장 검증 가격 =====
insert into public.menu_variants (id, menu_id, name, base_price, is_default, sort_order) values
  -- BMT
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '15cm',   6900, true,  10),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '30cm',  11200, false, 20),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', '샐러드', 8400, false, 30),
  -- 치킨 데리야끼
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', '15cm',   6900, true,  10),
  ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000002', '30cm',  11200, false, 20),
  ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000002', '샐러드', 8400, false, 30),
  -- 서브웨이 클럽
  ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000003', '15cm',   8200, true,  10),
  ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000003', '30cm',  13900, false, 20),
  -- 터키 베이컨 아보카도
  ('20000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000004', '15cm',   8500, true,  10),
  ('20000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000004', '30cm',  14500, false, 20),
  -- 에그마요
  ('20000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000005', '15cm',   5500, true,  10),
  ('20000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000005', '30cm',   9500, false, 20)
on conflict (menu_id, name) do update
   set base_price = excluded.base_price,
       is_default = excluded.is_default,
       sort_order = excluded.sort_order;

-- ===== 옵션 그룹 (서브웨이 공통, 메뉴 무관) =====
-- v2.2 Patch 1: 세트여부도 옵션 그룹으로 처리
insert into public.option_groups
  (id, brand_id, menu_id, name, selection_mode, option_role, min_select, max_select, is_required, show_in_card, card_priority, sort_order) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', null, '빵 종류',  'single',   'include', 1, 1, true,  true,  10, 10),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', null, '치즈',     'single',   'include', 0, 1, false, true,  20, 20),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', null, '야채',     'multiple', 'include', 0, 9, false, false, 30, 30),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', null, '소스',     'multiple', 'include', 0, 5, false, true,  40, 40),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', null, '추가 토핑', 'multiple', 'add',     0, 5, false, false, 50, 50),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', null, '세트여부',  'single',   'meta',    1, 1, true,  false, 60, 60)
on conflict (id) do nothing;

-- ===== 옵션 항목 — 빵 6 / 치즈 3 / 야채 9 / 소스 14 / 추가 9 / 세트 2 =====
-- 빵 (6)
insert into public.option_items (option_group_id, name, alias_names, price_delta, sort_order) values
  ('30000000-0000-0000-0000-000000000001', '위트',                  array['위트브레드'],            0, 10),
  ('30000000-0000-0000-0000-000000000001', '하티',                  array['하티이탈리안'],          0, 20),
  ('30000000-0000-0000-0000-000000000001', '허니오트',              array['허니오트브레드'],        0, 30),
  ('30000000-0000-0000-0000-000000000001', '파마산오레가노',        array['파마산'],                0, 40),
  ('30000000-0000-0000-0000-000000000001', '플랫브레드',            array['플랫'],                  0, 50),
  ('30000000-0000-0000-0000-000000000001', '화이트',                array['화이트브레드'],          0, 60)
on conflict (option_group_id, name) do nothing;

-- 치즈 (3)
insert into public.option_items (option_group_id, name, alias_names, price_delta, sort_order) values
  ('30000000-0000-0000-0000-000000000002', '아메리칸치즈', array['아메리칸'],   0, 10),
  ('30000000-0000-0000-0000-000000000002', '슈레드치즈',   array['슈레드'],     0, 20),
  ('30000000-0000-0000-0000-000000000002', '모차렐라치즈', array['모차렐라'],   0, 30)
on conflict (option_group_id, name) do nothing;

-- 야채 (9)
insert into public.option_items (option_group_id, name, alias_names, price_delta, sort_order) values
  ('30000000-0000-0000-0000-000000000003', '양상추',         array[]::text[], 0, 10),
  ('30000000-0000-0000-0000-000000000003', '토마토',         array[]::text[], 0, 20),
  ('30000000-0000-0000-0000-000000000003', '오이',           array[]::text[], 0, 30),
  ('30000000-0000-0000-0000-000000000003', '피망',           array['피망/파프리카'], 0, 40),
  ('30000000-0000-0000-0000-000000000003', '양파',           array[]::text[], 0, 50),
  ('30000000-0000-0000-0000-000000000003', '피클',           array[]::text[], 0, 60),
  ('30000000-0000-0000-0000-000000000003', '올리브',         array[]::text[], 0, 70),
  ('30000000-0000-0000-0000-000000000003', '할라피뇨',       array['할라'],   0, 80),
  ('30000000-0000-0000-0000-000000000003', '아보카도',       array[]::text[], 1500, 90)
on conflict (option_group_id, name) do nothing;

-- 소스 (14)
insert into public.option_items (option_group_id, name, alias_names, price_delta, sort_order) values
  ('30000000-0000-0000-0000-000000000004', '랜치',                   array[]::text[],                          0, 10),
  ('30000000-0000-0000-0000-000000000004', '사우스웨스트',           array['사웨', '사우스'],                  0, 20),
  ('30000000-0000-0000-0000-000000000004', '스위트칠리',             array['스칠'],                            0, 30),
  ('30000000-0000-0000-0000-000000000004', '스위트어니언',           array['스어'],                            0, 40),
  ('30000000-0000-0000-0000-000000000004', '머스타드',               array['머'],                              0, 50),
  ('30000000-0000-0000-0000-000000000004', '허니머스타드',           array['허머'],                            0, 60),
  ('30000000-0000-0000-0000-000000000004', '마요네즈',               array['마요'],                            0, 70),
  ('30000000-0000-0000-0000-000000000004', '올리브오일',             array['오일'],                            0, 80),
  ('30000000-0000-0000-0000-000000000004', '레드와인식초',           array['식초'],                            0, 90),
  ('30000000-0000-0000-0000-000000000004', '소금',                   array[]::text[],                          0, 100),
  ('30000000-0000-0000-0000-000000000004', '후추',                   array[]::text[],                          0, 110),
  ('30000000-0000-0000-0000-000000000004', '핫칠리',                 array['핫'],                              0, 120),
  ('30000000-0000-0000-0000-000000000004', '바비큐',                 array['BBQ', '비큐'],                    0, 130),
  ('30000000-0000-0000-0000-000000000004', '치폴레사우스웨스트',     array['치폴레'],                          0, 140)
on conflict (option_group_id, name) do nothing;

-- 추가 토핑 (9)
insert into public.option_items (option_group_id, name, alias_names, price_delta, sort_order) values
  ('30000000-0000-0000-0000-000000000005', '베이컨',         array[]::text[],   1500, 10),
  ('30000000-0000-0000-0000-000000000005', '아보카도 추가', array['아보카도'],  1500, 20),
  ('30000000-0000-0000-0000-000000000005', '에그마요 추가', array['에그마요'],  1500, 30),
  ('30000000-0000-0000-0000-000000000005', '치즈 추가',     array['치즈'],      1000, 40),
  ('30000000-0000-0000-0000-000000000005', '미트 더블',     array['더블'],      3000, 50),
  ('30000000-0000-0000-0000-000000000005', '페퍼로니',       array[]::text[],   1500, 60),
  ('30000000-0000-0000-0000-000000000005', '햄 추가',       array['햄'],        1500, 70),
  ('30000000-0000-0000-0000-000000000005', '오이 픽클 추가', array[]::text[],   500,  80),
  ('30000000-0000-0000-0000-000000000005', '할라피뇨 추가', array['할라피뇨'],  500,  90)
on conflict (option_group_id, name) do nothing;

-- 세트여부 — R-15: 단품 0원, 세트 +2,500원 명시
insert into public.option_items (option_group_id, name, alias_names, price_delta, sort_order) values
  ('30000000-0000-0000-0000-000000000006', '단품', array[]::text[], 0,    10),
  ('30000000-0000-0000-0000-000000000006', '세트', array['콤보'],   2500, 20)
on conflict (option_group_id, name) do nothing;

-- ===== 태그 =====
insert into public.tags (slug, label, emoji, sort_order) values
  ('beginner',   '초보추천',     '🔰', 10),
  ('diet',       '다이어트',     '🥗', 20),
  ('spicy',      '매운맛',       '🌶️', 30),
  ('hearty',     '든든한 점심', '🍱', 40),
  ('cheap',      '가성비',       '💰', 50),
  ('popular',    '인기',         '⭐', 60)
on conflict (slug) do update
   set label      = excluded.label,
       emoji      = excluded.emoji,
       sort_order = excluded.sort_order;
