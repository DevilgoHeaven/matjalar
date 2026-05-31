# 맛잘알 v1.6 콘텐츠 확장 기준

기준일: 2026-05-25

## 적용 범위

- 편의점: `cvs` 카테고리, `GS25`, `CU` 우선.
- 버거: `fastfood` 카테고리, `McDonald's`, `Burger King` 우선.
- 구조화 후보는 `packages/db/src/lib/content-expansion-seeds.ts`에 40개로 고정했다.
- 운영 검토 화면은 `/admin/content-backlog`에서 확인한다.
- 아직 운영자 검증 전이므로 모든 후보는 `priceStatus='approx'`, `confidence='unverified'`로 둔다.
- `priceStatus='exact'`는 `content_source_refs.source_kind in ('official', 'operator_check')`일 때만 허용한다.

## 조사 근거

- McDonald's Korea 공식 메뉴: https://www.mcdonalds.co.kr/kor/menu/mc-cafe
- Burger King Korea 공식 메뉴: https://web-prd.burgerking.co.kr/menu/main
- CU 공식 상품 페이지: https://cu.bgfretail.com/product/product.do
- GS25 공식 먹거리/서비스 페이지: https://gs25.gsretail.com/gscvs/ko/store-services/new-concept
- Trend Monitor 2025 편의점 이용 조사 미리보기: https://www.trendmonitor.co.kr/Data/CKOREA/3237/20250507070740_20250422%202025%20%ED%8E%B8%EC%9D%98%EC%A0%90%20%EC%9D%B4%EC%9A%A9%20%EB%B0%8F%20%EC%BD%9C%EB%9D%BC%EB%B3%B4%20%EC%A0%9C%ED%92%88%20%EA%B4%80%EB%A0%A8%20U%26A%20%EC%A1%B0%EC%82%AC_%EB%AF%B8%EB%A6%AC%EB%B3%B4%EA%B8%B0.pdf
- Reddit 커뮤니티 편의점 경험담: https://www.reddit.com/r/unravelkorea/comments/1rouvve/korean_convenience_stores_are_genuinely_underrated/

## 운영 규칙

1. 후보 조합을 실제 공개 데이터로 승격하기 전 `brands`, `menus`, `menu_variants`, `option_groups`, `option_items` 카탈로그 row를 먼저 만든다.
2. 공식 페이지 또는 운영자 현장 확인이 없는 가격은 `approx`로 유지한다.
3. 커뮤니티 기반 맛 조합은 원문 표현을 복사하지 않고 운영자 원문으로 다시 작성한다.
4. 가격·품절·옵션 변경 제보는 `correction_reports`에만 쌓고, 공개 데이터는 관리자 검토 후 별도 반영한다.
5. 공개 상세 페이지는 출처 개수와 확인일만 보여주고, 원천 링크와 확신도는 `/admin/source-refs`에서 확인한다.
