-- supabase/seed.sql — 옵션·메뉴 마스터 시드
--
-- 자동 실행: `supabase db reset` 시 마이그레이션 적용 후 본 파일이 실행됨
-- 멱등(idempotent) — 반복 실행해도 동일 결과 (ON CONFLICT 사용)
--
-- 본 파일은 M1 에서 본격 채워짐. 지금은 placeholder.

-- ===== 카테고리 =====
-- 7개 카테고리 (패스트푸드만 active, 나머지 planned)
-- M1 에서 INSERT 추가

-- ===== 브랜드 =====
-- 서브웨이 (is_active=true), 나머지 launch_status='planned'
-- M1 에서 INSERT 추가

-- ===== 옵션 그룹 =====
-- 빵, 치즈, 야채, 소스, 추가, 세트여부 (R-15: +2,500 row 포함)
-- M1 에서 INSERT 추가

-- ===== 옵션 아이템 =====
-- 빵 6 / 치즈 3 / 야채 9 / 소스 14 / 추가 ~10 / 세트여부 2종
-- alias_names 포함 (예: '사우스웨스트' aliases=['사웨'])
-- M1 에서 INSERT 추가

-- ===== 태그 =====
-- 초보추천, 다이어트, 매운맛, 든든한점심, 가성비
-- M1 에서 INSERT 추가
