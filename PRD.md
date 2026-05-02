# 맛잘알 — Product Requirements Document

> 마지막 업데이트: 2026-04-30
> 버전: **v2.1** (2차 피드백 10개 항목 반영, 코딩 시작 가능 수준)
> 작성 의도: 클로드 코드 / 개발 에이전트에게 프로젝트 컨텍스트로 전달

---

## 1. 제품 개요

### One-liner
프랜차이즈 메뉴와 꿀조합을 사람들이 직접 등록·검증하는 모바일 위키.

### 컨셉
"흩어진 정보를 카드로 압축". 블로그/유튜브/디시에 흩어져 있는 꿀조합 정보를 표준화된 카드 형태로 30초 안에 쓸 수 있게 만든다.

### 본질
**가상의 배달앱**. 단, 주문은 안 받고 조합만 공유한다. 사용자는 매장 키오스크 앞에서 카드를 보며 직접 옵션을 누른다.

### v1 차별화
- 블로그 5분 검색 → 카드 30초 탐색
- 옵션 조합을 한 줄 카드로 압축
- 따봉/평점/한 줄 후기 기반 조합 검증
- 가격/단종/옵션 변경 감지 기반 최신성 확보

> 메뉴 단독 평가는 v1.5+ 로 이동.

---

## 2. 타겟 사용자

### 1순위
"남들은 뭐 먹지?"가 궁금한 사람
- **초보**: 카운터/키오스크 앞에서 뭘 시킬지 모름
- **단골 매너리즘**: 늘 같은 거 시킴, 새 조합 탐색

### 2순위
**맛잘알 (콘텐츠 생산자)** — 자기 조합 공유하고 따봉/평점 받고 싶은 사람

---

## 3. 플랫폼

- **모바일 PWA** (Next.js 15)
- 사용 시나리오: 매장/키오스크 앞에서 폰으로 카드 보면서 옵션 따라 누름
- 데스크톱은 후순위, 네이티브 앱은 시즌 2

---

## 4. 인증/권한 정책

### v1: 회원 전용 인터랙션
모든 인터랙션(따봉/찜/후기/조합 등록)은 **로그인 후에만** 가능.

### 회원 전용 인터랙션 UX 원칙 (v2.1 추가, 중요)

비회원 진입 흐름:
- 조합 조회/검색/상세 페이지 열람: **비회원 가능**
- 비회원이 따봉/찜/후기/조합 등록 버튼 클릭 시:
  - **로그인 모달(바텀시트) 표시** — 페이지 이동 X
  - 카카오 로그인 버튼 최상단
  - 로그인 완료 후 **사용자가 누르려던 액션을 자동으로 이어서 실행**
  - 예: 따봉 누름 → 로그인 모달 → 카카오 로그인 완료 → 따봉 자동 적용

**원칙**: "로그인해야 합니다"가 아니라 **"찜하려면 3초 로그인"** 느낌.

기술 구현:
- 로그인 모달은 글로벌 컨텍스트 (`AuthModalProvider`)
- 액션 큐(pending action) 패턴으로 로그인 후 실행 보장

### 인증 수단
- **v1**: 카카오 로그인 + 구글 로그인 (Supabase Auth)
- **v1.5**: 네이버 로그인 (커스텀 OAuth)

### app_users ↔ Supabase Auth 연결 (v2.1 명시)
- `app_users.id`는 **`auth.users.id`와 동일한 UUID** 사용
- `app_users.id uuid primary key references auth.users(id) on delete cascade`
- `role` 변경은 클라이언트에서 불가, **service role 또는 관리자만**
- RLS에서 `is_admin(auth.uid())` 함수로 관리자 권한 체크

### RLS 정책 핵심
```sql
-- 익명 사용자: SELECT만 가능 (status='published'만)
-- 회원: 본인 데이터만 INSERT/UPDATE/DELETE
-- 관리자: 전체 권한 (is_admin 함수)
-- 조합 등록: 자동 status='pending', 관리자 승인 후 'published'
```

### 보험 조항
- v1 출시 후 1개월 따봉/찜 클릭률 5% 미만이면
- → v1.5에서 "찜만 비회원 허용" 검토
- 데이터 기반 결정, 한 번에 못 박지 않음

---

## 5. v1 MVP 범위

### 첫 브랜드
**서브웨이 1개만**.

### 출시 최소 데이터
- 메뉴 마스터 20~30개 (크롤링 + 검수)
- **메뉴 변형(menu_variants)** 50~60개 (15cm/30cm/세트 등)
- 옵션 마스터 (빵 6/치즈 3/야채 9/소스 14, 크롤링 자동)
- **핵심 조합 60개** (사용자님 직접 검수)
  - 초보추천 15개
  - 다이어트/저칼로리 10개
  - 매운맛 10개
  - 든든한 점심 10개
  - 가성비 10개
  - 기타 인기 5개
- 각 조합에 **운영자 추천 메모(seed_comment) 1개씩** (실제 후기와 구분)

### 출시 후 1개월 목표
- 조합 200개
- 사용자 후기 300개
- 따봉/찜 1,000개

### v1 화면 (5개)
1. 카테고리 홈 (검색바, 카테고리 그리드, 오늘의 인기)
2. 브랜드 페이지 (인기 탭만)
3. 조합 상세 (옵션 박스 + 대표 후기 + 한 줄 후기)
4. 조합 등록 폼 (배달앱 스타일, 회원만)
5. 찜 페이지

### v1 카테고리 홈 정책 (v2.1 추가)
서브웨이 1개만 있는 v1에서는:
- **active 브랜드가 있는 카테고리만 활성화** (= 패스트푸드)
- 빈 카테고리는 "**준비중**" 배지로 비활성화 (회색 처리, 클릭 시 "곧 만나요" 토스트)
- 홈의 시각적 무게 중심을 **"오늘의 인기 조합"** 섹션으로 이동
- 카테고리 그리드는 작게, 인기 조합 섹션은 크게

### v1 기능
- 따봉/찜 (회원 전용, 로그인 모달)
- 한 줄 후기 + 1~5점 평점 (회원 전용)
- 대표 후기 자동 선정 (review_votes 기반)
- **시드 후기 구분** (`admin_seed` vs `user`, 후술)
- 자동 **예상가** 계산 (price_status 표시)
- 카드 요약 자동 생성 (`card_summary` 저장)
- **중복 조합 경고** (combo_signature 기반)
- 검색 (PostgreSQL ILIKE)
- 카카오/구글 로그인 (Supabase Auth)
- 신고 기능 (조합/후기) — v1 최소 범위
- 관리자 대시보드 (조합 승인 + 카탈로그 변경 승인 + 신고 처리)

### v1.5 이후
- 네이버 로그인 (커스텀 OAuth)
- 급상승/신규 탭 (`combo_daily_stats`)
- 메뉴별 보기 탭
- 메뉴 단독 평점/리뷰
- 세부 평점 (맛/가성비/재구매 의사)
- 검증/수정 제안 워크플로
- 알레르기/원산지 정보 (공홈 자동, 출처 명시)
- 메뉴 raw 스냅샷 (`menu_snapshots`)

---

## 6. 정보 노출 3단계 원칙

### 1단계: 카테고리 홈 카드 (흥미 유도용)
```
실패없는 BMT 정석
서브웨이 · BMT · 초보추천
👍 1,284 · ⭐ 4.7
```

### 2단계: 브랜드 페이지 카드 (비교 단위)
```
실패없는 BMT 정석
BMT 15cm · 위트 · 랜치+사웨 외 2
#초보추천 #가성비
👍 1,284 · ⭐ 4.7 · 💬 83     약 7,500원
```

### 3단계: 조합 상세
모든 옵션 영수증 박스. 대표 후기 박스. 한 줄 후기 리스트.

### 카드 요약 템플릿 (브랜드별)
- **서브웨이**: 메뉴 · 사이즈 · 빵 · 소스(외 N)
- **공차**: 메뉴 · 당도 · 얼음 · 토핑(외 N)
- **스타벅스**: 메뉴 · 샷/시럽 · 우유 · 휘핑
- **편의점**: 메인 · 추가 · 조리

---

## 7. 데이터 모델 (v2.1)

### v1 테이블 (19개)

#### 카탈로그 (6개) — menu_variants 추가
- `categories` — 패스트푸드/카페디저트/치킨/피자/분식/뷔페/편의점
- `brands` — 서브웨이, 공차 등
  - `is_active`, `launch_status` (planned/active/hidden)
- `menus` — BMT, 블랙밀크티 등
  - `external_id` (서브웨이 menuItemIdx), `status` (active/discontinued/seasonal/unknown)
  - `source_url`, `last_synced_at`
- **`menu_variants` (v2.1 신규)** — 메뉴의 사이즈/형태별 변형
  - `id`, `menu_id` FK
  - `name` (예: "15cm", "30cm", "샐러드", "단품", "세트")
  - `base_price`
  - `is_default` (대표 변형, 카드 요약 시 기본값)
  - `sort_order`
- `option_groups` — 빵, 치즈, 소스 등
  - `brand_id` FK, `menu_id` nullable
  - `selection_mode` (single/multiple), `option_role` (include/exclude/add/meta)
  - `min_select`, `max_select`, `is_required`
  - `show_in_card`, `card_priority`
- `option_items` — 위트, 슈레드, 사우스웨스트 등
  - `external_id` nullable
  - `alias_names text[]` (예: ['사웨', '사우스웨스트'])
  - `price_delta`, `is_available`

#### 조합 (4개)
- `combos` — 조합 카드 본체
  - `brand_id`, `primary_menu_id`, **`menu_variant_id` (v2.1)**, `creator_id` FK
  - `card_summary` (저장된 한 줄 요약)
  - `estimated_price`, `price_status` (exact/approx/unknown)
  - `featured_review_id` nullable
  - **`seed_comment varchar(140)` (v2.1)** — 운영자 추천 메모, 실제 후기 없을 때 표시
  - **`combo_signature varchar(255)` (v2.1)** — 중복 조합 감지용 해시
  - `search_text` (검색 인덱스용)
  - `status` (pending/published/hidden/rejected)
  - `published_at`, `rejected_reason` nullable
- `combo_options` — 조합 옵션 (snapshot)
  - `combo_id`, `option_group_id` nullable, `option_item_id` nullable
  - `action_type` (select/exclude/add) — 핵심
  - `quantity`
  - `group_name_snapshot`, `option_name_snapshot`, `price_delta_snapshot`
  - `sort_order`
- `tags` — 매운맛, 초보추천 등
- `combo_tags` — 조합 ↔ 태그 M:N

#### 상호작용 (5개)
- `app_users` — 사용자
  - **`id uuid primary key references auth.users(id) on delete cascade` (v2.1 명시)**
  - `nickname`, `avatar_url`
  - `role` (user/trusted/admin) — 클라이언트 수정 불가
  - `status` (active/suspended/deleted)
- `reviews` — 한 줄 후기 + 평점
  - `combo_id`, `user_id` FK
  - `rating numeric(2,1) check (rating >= 1 and rating <= 5)`
  - `content varchar(140)`
  - **`source_type` (user/admin_seed) (v2.1)** — 운영자 시드 데이터와 구분
  - `status` (published/hidden/reported)
- `review_votes` — 후기에 대한 따봉
  - `review_id`, `user_id` FK, `unique(review_id, user_id)`
- `combo_votes` — 조합 따봉
  - `combo_id`, `user_id` FK, `unique(combo_id, user_id)`
- `bookmarks` — 찜
  - `combo_id`, `user_id` FK, `unique(combo_id, user_id)`

#### 운영/통계 (4개) — crawler_runs, reports 추가
- `combo_stats` — 캐시 통계
  - `vote_count`, `bookmark_count`, `review_count`
  - `average_rating`, `hot_score`, `view_count`
  - `updated_at`
- **`crawler_runs` (v2.1, v1으로 이동)** — 크롤러 실행 로그
  - `id`, `source_name` (subway_freshInfo, subway_menuList_sandwich 등)
  - `started_at`, `finished_at`
  - `status` (success/failed/partial)
  - `fetched_count`, `changed_count`
  - `error_message` nullable
- `catalog_change_logs` — 크롤러 변경 이력
  - **`crawler_run_id` FK (v2.1)**
  - `brand_id`, `target_type` (menu/option_group/option_item/menu_variant)
  - `external_id`
  - `change_type` (created/updated/missing/selector_error)
  - `before_data jsonb`, `after_data jsonb`
  - `status` (pending/approved/ignored)
- **`reports` (v2.1, v1 최소 범위)** — 신고
  - `id`, `target_type` (combo/review), `target_id`
  - `user_id` FK, `reason text`
  - `status` (pending/resolved/ignored)

### v1.5 추가 테이블
- `combo_verifications` — 사용자 가격 변경 제보
- `edit_suggestions` — 위키형 수정 제안
- `combo_daily_stats` — 일별 통계 (급상승)
- `menu_snapshots` — 크롤러 raw 데이터 (디버깅)

### 핵심 설계 포인트

**1. snapshot 패턴**
`combo_options`에 `group_name_snapshot`, `option_name_snapshot`, `price_delta_snapshot`. 옵션 단종/변경에도 데이터 유지.

**2. action_type**
- `select`: 빵/치즈 선택
- `exclude`: 양상추/피클 빼기
- `add`: 베이컨/아보카도 추가

**3. card_summary 미리 저장**
조합 등록/수정 시 서버에서 `card_summary` 생성 후 저장. 리스트 페이지 N+1 방지.

**4. menu_variants (v2.1)**
서브웨이 15cm/30cm/세트 가격 차이를 옵션으로 처리 안 함. 메뉴의 본질적 구분이라 별도 테이블.

**5. combo_signature (v2.1) — 중복 방지**
생성 방식:
```
sha256(
  brand_id + ":" + 
  menu_variant_id + ":" + 
  sorted(combo_options.map(o => action_type + ":" + option_group_id + ":" + option_item_id))
)
```

unique 제약은 안 걸음 (너무 빡빡). 등록 시 동일 signature 있으면 **유사 조합 경고**:
```
이미 비슷한 조합이 있어요:
- 실패없는 BMT 정석 (👍 1,284)
계속 등록하시겠어요?
```

**6. seed_comment (v2.1) — 가짜 후기 방지**
- `combos.seed_comment`: 운영자가 직접 적은 추천 메모. "운영자 추천"으로 표시
- 실제 사용자 후기와 시각적으로 구분 (회색 박스, "운영자 추천 메모" 라벨)
- 외부 커뮤니티/블로그 문장 그대로 복사 금지
- `reviews.source_type='admin_seed'`도 같은 용도

**7. 회원 전용 + RLS**
모든 INSERT/UPDATE는 `auth.uid() IS NOT NULL`. 본인 데이터만 수정 가능.

**8. option_groups.menu_id nullable**
대부분 옵션은 브랜드 공통. 시즌 메뉴 전용은 `menu_id` 지정.

### 자동 가격 계산 (v2.1 수정)

**기본 공식**:
```
combo.estimated_price = 
    menu_variant.base_price 
    + sum(combo_options 중 action_type='add'인 option_items.price_delta)
```

**핵심 변경**: `menu.base_price` → `menu_variant.base_price`. 사이즈/세트별 가격 직접 참조.

**price_status**:
- `exact`: 공홈에 가격 명시되어 있고 검증됨
- `approx`: 사용자 입력 또는 추정값 (대부분 v1)
- `unknown`: 가격 정보 없음

**카드 표시**:
```
약 7,500원
가격은 매장/시점에 따라 다를 수 있어요.
```

---

## 8. 기술 스택

```
프론트   Next.js 15 + TypeScript + Tailwind + shadcn/ui (PWA)
인증     Supabase Auth (카카오 + 구글, v1.5에 네이버)
DB       Supabase (PostgreSQL)
크롤러   Python + GitHub Actions cron (httpx + BeautifulSoup)
배포     Vercel (프론트) + Supabase (DB)
모니터링 Discord webhook
```

**비용**: v1은 0원. 트래픽 나면 Vercel Pro $20/월 + Supabase Pro $25/월.

---

## 9. 데이터 소스 매핑 (서브웨이)

### 자동 크롤링

| 데이터 | URL | 추출 방식 |
|---|---|---|
| 빵 6종 (이름/칼로리) | /freshInfo | HTML 파싱 |
| 치즈 3종 | /freshInfo | HTML 파싱 |
| 야채 9종 | /freshInfo | HTML 파싱 |
| 소스 14종 | /freshInfo | HTML 파싱 |
| 메뉴 마스터 | /menuList/sandwich, /unit, /salad, /morning | HTML 파싱 |
| 메뉴 상세 (원산지, 알레르기) | /menuView/sandwich?menuItemIdx={id} | v1.5 |
| 추가 토핑 마스터 | /menuList/sandwich (추가 선택 섹션) | HTML 파싱 |

### external_id
**서브웨이 `menuItemIdx`를 `menus.external_id`로 사용**.

### 수동 입력 (1회)
- 메뉴 가격 (약 30개) — 블로그/나무위키 시드 → 매장 검증
- 추가 토핑 가격 (약 10개)
- **menu_variants 가격** — 15cm/30cm/세트별 다름, 매장 검증 필수
- 모두 `price_status='approx'`

### 사용자 기여 (v1.5)
- 가격 변경 제보, 신메뉴 제보, 단종 제보

---

## 10. 크롤링 파이프라인

### 흐름
```
GitHub Actions cron (매일 18:00 UTC = 03:00 KST)
  → Python 봇 fetch
  → crawler_runs INSERT (status='running')
  → HTML 파싱 + 정규화
  → DB 기존 데이터 비교 (external_id 매칭)
  → 변경 감지
  → catalog_change_logs INSERT (crawler_run_id 연결, status='pending')
  → crawler_runs UPDATE (status='success', counts)
  → Discord webhook 알림
  → 관리자가 대시보드에서 검토 후 승인
  → 승인 시 production 테이블에 적용
```

**핵심**: production 테이블에 직접 UPSERT 안 함. `catalog_change_logs` 거쳐 관리자 승인 후 반영.

### GitHub Actions cron
```yaml
on:
  schedule:
    - cron: "0 18 * * *"  # 03:00 KST (UTC 기준 18:00)
```

### Sanity check
- 평소 메뉴 30개 → 갑자기 0~3개? → `crawler_runs.status='failed'`, 동기화 중단, Discord 빨간 알림
- 셀렉터 깨짐 감지 = 잘못된 데이터로 DB 덮어쓰기 방지

### 알림 종류 (Discord webhook)
- 🆕 신메뉴 발견 (승인 대기)
- ⚠️ 메뉴 사라짐 (단종 의심)
- 🔄 옵션/이미지 변경
- ❌ 봇 실패 / 셀렉터 깨짐

### 코드 구조
```
crawler/                              # 별도 GitHub repo
├── .github/workflows/sync.yml
├── src/
│   ├── fetch.py
│   ├── parse.py
│   ├── normalize.py
│   ├── match.py
│   ├── diff.py
│   ├── stage.py                      # crawler_runs + catalog_change_logs INSERT
│   └── notify.py
├── main.py
└── requirements.txt
```

---

## 11. 이미지 / 크롤링 정책 (개발 전 결정사항)

### 이미지 정책
- **공홈 이미지 핫링크 X, 다운로드/재배포 X**
- v1 카드는 이미지 없이 텍스트/이모지/브랜드 컬러 중심
- v1.5+ 직접 촬영 또는 사용자 업로드 이미지만
- 사용자 업로드 시 약관에 사용권 동의 포함

### 크롤링 정책
- robots.txt 준수
- 사이트 이용약관 사전 검토
- 로그인/우회/차단 회피 X
- 리뷰/블로그/댓글 본문 복사 X
- **사실 정보만**: 메뉴명, 옵션명, 칼로리, 카테고리
- 출처 + 마지막 확인일 표시 (`menus.source_url`, `last_synced_at`)

### 약관 필수 (v1 출시 전)
- 이용약관, 개인정보처리방침, 사용자 콘텐츠 라이선스 조항

---

## 12. 디자인 가이드

### 톤
- 미니멀, 깔끔, 배달앱 풍, 친근한 한국어, 이모지 가능

### 컬러
- 카테고리별 파스텔, 메인 액션 검은색, 찜 하트 핑크/빨강

### 카드 UX 원칙
1. 한눈에 스캔 — 1단계는 4줄, 2단계는 4줄, 3단계는 영수증
2. 옵션 줄임 — `플랫브레드` → `플랫`, 다중은 `외 N`
3. 자유 서술 X — 한 줄 후기 강제 (140자)
4. 이미지 없음 — 텍스트/이모지/브랜드 컬러로 차별화

### 등록 폼 UX
- 옵션 그룹별 칩(pill) UI
- 사이즈 선택 (menu_variants) → 빵 → 치즈 → 야채/추가/소스 순
- 필수/선택, 단일/다중 명확히 표시
- 빼는 야채는 빨간색 (`action_type=exclude`)
- 자동 계산 예상가 실시간 표시
- **유사 조합 경고** (combo_signature 매칭 시)

### 시드 후기 표시
운영자 추천 메모(`source_type='admin_seed'`)는:
- 회색 박스 + "운영자 추천 메모" 라벨
- 실제 사용자 후기와 명확히 시각 구분
- 따봉 버튼 비활성화

---

## 13. 콜드 스타트 전략

### 데이터 채우기 순서
1. **옵션 마스터**: 크롤링 자동 (`/freshInfo`)
2. **메뉴 마스터**: 크롤링 자동 (`/menuList/*`)
3. **menu_variants**: 수동 입력 (사이즈/세트 가격)
4. **메뉴 가격**: 블로그/나무위키 시드 → 매장 1회 검증
5. **첫 60개 조합**: 사용자님이 직접 검수해서 등록
   - 디시 햄최몇 갤러리, 블로그, 유튜브 댓글 참고 (문장 복사 X)
   - 각 조합에 `seed_comment` 한 줄
   - 출시 후 1개월 200개 목표

### 시드 데이터 정책 (v2.1 추가)
- 운영자 입력 후기는 **`reviews.source_type='admin_seed'`** 또는 **`combos.seed_comment`** 사용
- "운영자 추천 메모"로 명시 표시
- **외부 커뮤니티/블로그 문장 그대로 복사 X** — 운영자가 직접 한 줄로 작성
- 실제 사용자 후기 발생 시 시드 후기는 자연스럽게 후순위로

### 출시 검증
- 랜딩 페이지 (목표: 방문자 300명, 알림 신청 30명)
- 카카오톡 단톡방, 디시 햄최몇 갤러리에 시드 사용자 확보
- 첫 60개 조합 등록 시 본인 + 지인 5~10명 따봉/후기 시드

---

## 14. 개발 순서 (v2.1 수정)

### Step 1: 프로젝트 셋업
Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase JS. PWA 설정.

### Step 2: DB 스키마 + RLS
이 PRD의 7번 섹션 기반으로 `schema.sql` 작성 → Supabase 적용.

**RLS 정책 핵심**:
- 익명: SELECT만 (status='published')
- 회원: 본인 데이터만 INSERT/UPDATE/DELETE
- `is_admin(auth.uid())` 함수로 관리자 권한
- 조합 등록: `status='pending'` → 관리자 승인

### Step 3: Supabase Auth + 프로필
- 카카오/구글 OAuth 연결
- 첫 로그인 시 `app_users` 자동 생성 (트리거)
- `app_users.id = auth.users.id` 보장

### Step 4: 시드 입력 도구 (v2.1 추가, 우선순위 ↑)
화면 만들기 전에 **데이터 넣을 도구 먼저**:
- 옵션 매스터 일괄 입력 SQL/JSON seed
- 관리자 페이지 `/admin/seed`:
  - 메뉴/menu_variant 입력 폼
  - 조합 일괄 등록 폼 (60개 빠르게 입력)
  - seed_comment 입력 필드
- 또는 Supabase SQL editor용 seed script

### Step 5: 화면 구현 순서
1. 브랜드 페이지 `/brand/subway`
2. 조합 상세 `/combo/[id]`
3. 조합 등록 폼 `/combo/new` (회원 전용)
4. 카테고리 홈 `/`
5. 찜 페이지 `/bookmarks`
6. 로그인 모달 (글로벌 컴포넌트, 액션 큐 패턴)

### Step 6: 관리자 대시보드
- 조합 승인 큐
- `catalog_change_logs` 변경 승인 큐
- `reports` 신고 처리
- 후기/조합 숨김
- 유저 정지

### Step 7: 크롤러 (별도 repo)
대상: subway.co.kr/freshInfo, /menuList/*
출력: `crawler_runs` + `catalog_change_logs`
스케줄: GitHub Actions cron (UTC 18:00 = KST 03:00)

### Step 8: 출시 + 검증
도메인 연결, Vercel 배포, 사전 사용자 공개

---

## 15. 성공 지표 (v2.1 수정 — 퍼널 분리)

### 출시 전
- [ ] 랜딩페이지 방문자 300명
- [ ] 사전 알림 신청 30명
- [ ] 조합 카드 예시 SNS 반응 확인

### 출시 후 2주

#### 비회원 포함 전체 퍼널
- [ ] 순방문자 1,000명
- [ ] 조합 상세 진입률 25% 이상
- [ ] 로그인 버튼 클릭률 8% 이상
- [ ] 로그인 완료율 40% 이상

#### 로그인 사용자 퍼널
- [ ] 로그인 사용자 중 따봉/찜 클릭률 30% 이상
- [ ] 로그인 사용자 중 한 줄 후기 작성률 5% 이상
- [ ] 로그인 사용자 중 조합 등록 시도 10건 이상
- [ ] 재방문율 15% 이상

### 핵심 검증 질문
- 사람들이 서브웨이 조합을 검색해서 들어오는가?
- 카드만 보고 조합을 이해하는가?
- 로그인 모달에서 회원가입까지 가는가?
- 회원가입 후 따봉/찜을 누르는가?
- 사용자가 직접 조합 등록을 시도하는가?

### 진단 매트릭스
| 상세 진입률 ↓ | 로그인 클릭률 ↓ | 진단 |
|---|---|---|
| 낮음 | - | 카드가 매력 없음 (디자인/요약 문제) |
| 높음 | 낮음 | 액션 버튼 발견 못함 (UX 문제) |
| 높음 | 높음, 완료율 낮음 | 카카오 로그인 자체 장벽 |
| 높음, 클릭률 높음, 완료율 높음, 따봉률 낮음 | - | **로그인 후 동기 부족** (이게 핵심 위험) |

### 보험 조항
- 출시 후 1개월 따봉/찜 클릭률(로그인 사용자 기준) 5% 미만이면
- → v1.5에서 "찜만 비회원 허용" 검토

---

## 16. 미해결 / 향후 결정

- [ ] 도메인 (가제 "맛잘알" → 정식 네임)
- [ ] 로고 디자인
- [ ] 이용약관 + 개인정보처리방침 작성 (v1 출시 전 필수)
- [ ] 첫 60개 조합 등록 일정
- [ ] v1.5 우선순위
- [ ] 두 번째 브랜드 후보 (공차/스타벅스/편의점 중)

---

## 17. 참고 자료

### 서브웨이 공홈
- 메인: https://www.subway.co.kr/
- 옵션 마스터: https://www.subway.co.kr/freshInfo
- 메뉴 리스트: /menuList/sandwich, /unit, /salad, /morning, /sidedrink
- 메뉴 상세: /menuView/sandwich?menuItemIdx={id}
- 영양 성분표: /freshNutritionFacts

### 가격 시드 출처 (출시 전 매장 검증 필수)
- 나무위키: https://namu.wiki/w/써브웨이
- 블로그 (가격 표 있는 글)
- ⚠️ 출시 전 매장 1회 방문 실제 메뉴판 검증 필수

### 벤치마크
- 거지맵, 배달의민족, 쿠팡이츠, 디시 햄최몇 갤러리

---

## 18. 변경 이력

### v2.1 (2026-04-30) — GPT 2차 피드백 10개 항목 반영
- **회원 전용 UX 원칙 명시** — 로그인 모달 + 액션 큐 패턴
- **KPI 퍼널 분리** — 전체 vs 로그인 사용자
- **시드 후기 구분** — `reviews.source_type` + `combos.seed_comment`
- **`menu_variants` 테이블 추가** (v1) — 15cm/30cm/세트 가격 분리
- **`combos.menu_variant_id`, `combo_signature`, `seed_comment` 추가**
- **`app_users.id = auth.users.id` 명시**
- **`crawler_runs` 테이블 v1으로 이동**
- **`reports` 테이블 v1 최소 범위 추가**
- **빈 카테고리 정책** — active 브랜드 있는 카테고리만 활성화
- **개발 순서 변경** — 시드 입력 도구를 화면 구현 전 Step 4로 이동
- 가격 계산 공식 수정 (`menu.base_price` → `menu_variant.base_price`)
- 테이블 수: 16 → 19개

### v2.0 (2026-04-30) — GPT 1차 피드백 9개 항목 반영
- 회원 전용 정책으로 전환 (anonymous_key 제거)
- 평점 v1으로 (단일 1~5점)
- review_votes v1으로
- featured_review_id 추가
- total_price → estimated_price + price_status
- combo_options.action_type 추가
- option_items.alias_names 추가
- catalog_change_logs 테이블 추가
- 이미지 정책 명시 (v1은 이미지 없음)
- "메뉴와 조합 분리 평가" 차별화 문구 제거
- 첫 60개 + 1개월 200개로 조정
- 성공 지표 (KPI) 추가
- GitHub Actions cron UTC 기준 명시

### v1.0 (2026-04-30)
- 초기 버전

---

**문서 끝.**

---

## 19. v2.2 미니 패치 (코딩 전 마지막 확정사항)

> v2.1을 다시 쓰지 않고 패치 노트로만 추가. 이 3개만 고정하고 코딩 시작.

### 패치 1: 세트는 option_group으로 처리

`menu_variants`는 **메뉴의 형태/사이즈만** 담는다.
```
menu_variants: 15cm, 30cm, 샐러드
```

세트 여부는 별도 옵션 그룹:
```
option_group: 세트 여부 (selection_mode='single', is_required=true)
  - 단품 (price_delta=0)
  - 세트 (price_delta=+2,500)
```

이유: 변형(variant) 곱하기 세트면 데이터 4배 폭발. 세트는 본질적으로 "추가 선택"임.

가격 공식 갱신:
```
estimated_price = 
    menu_variant.base_price 
    + 세트 옵션 price_delta
    + sum(action_type='add'인 option_items.price_delta)
```

### 패치 2: 시드 후기는 combos.seed_comment 한 곳만

v2.1에는 두 가지가 공존했음:
- `combos.seed_comment`
- `reviews.source_type='admin_seed'`

**v1에서는 `combos.seed_comment`만 사용한다.** `reviews.source_type` 필드 제거.

이유: 두 곳 두면 `review_count`/`average_rating` 계산 시 admin_seed 포함 여부로 매번 헷갈림. 운영자 추천은 후기가 아니라 **카드 보강 문구**다.

대표 후기 박스 표시 우선순위:
1. 사용자 후기 중 review_votes 가장 높은 것
2. 없으면 `combos.seed_comment` (운영자 추천 메모로 표시)
3. 둘 다 없으면 "첫 후기를 남겨주세요"

### 패치 3: reviews에 unique 제약 추가

```sql
ALTER TABLE reviews ADD CONSTRAINT reviews_combo_user_unique 
  UNIQUE (combo_id, user_id);
```

한 유저는 한 조합에 후기 하나만. 수정은 UPDATE로 가능. 이거 없으면 한 사람이 같은 조합에 후기 여러 개 → 평점 조작 가능.

### 코딩 시 자연스럽게 결정될 것들 (PRD에 박지 않음)
- combo_stats 갱신 방식 (Postgres trigger vs Route Handler) → schema.sql 짤 때 결정
- 파생 필드(card_summary 등) 서버 전용 → RLS 정책으로 자동 보장
- combo_signature 정확한 해시 공식 → 함수 짤 때 결정
- 베타 시드 윤리 → 운영 영역, PRD 외 사항

---

**진짜 끝.**
