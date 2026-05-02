# ADR-02 — 위험·완화 매트릭스 (R-01 ~ R-21)

> 작성일: 2026-05-02 / 출처: plan §4
> 본 문서는 4개 서브에이전트의 비판적 검토 + 공식 문서·CVE·커뮤니티 사례 조사로 발견된 모든 위험과 완화책을 한곳에 정리한다.
> 각 위험은 ID(R-NN), 위험 내용, 영향, 완화책으로 구성된다.

---

## 보안

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R-01** | CVE-2025-29927 — Next.js < 15.2.3 middleware bypass | /admin 인증 우회 가능 (CVSS 9.1) | `package.json`에 `^15.2.3` 핀 + `pnpm audit --audit-level=high`를 lefthook pre-commit/CI에서 실행 |
| **R-04** | service_role 키 클라이언트 누출 | RLS 우회, 전체 DB 노출 | (1) `lib/supabase/admin.ts` no-restricted-imports + (2) build 후 클라이언트 청크 한정 grep — `apps/web/.next/static/**` + `.next/server/app/**/page.client*`에 `SERVICE_ROLE`/`service_role` 0회 확인 + (3) `NEXT_PUBLIC_` prefix 절대 금지 |
| **R-09** | `is_admin()` 함수 재귀 (auth.users select on RLS table) | 무한 루프, 정책 평가 실패 | JWT claim 방식으로 회피 (Custom Access Token Hook) |

## 데이터 일관성·성능

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R-02** | pg_trgm은 한국어 미지원 (non-ASCII 가비지) | "사웨" 검색 누락, KPI 왜곡 | **PGroonga 도입** (Supabase 공식 supported), 60개 조합부터 적용 |
| **R-03** | combo_stats race condition (Server Action 카운터 증분) | 따봉/찜 카운트 skip/double | RPC 함수 `update_combo_stats(combo_id, kind, delta)` (SECURITY DEFINER, atomic UPDATE) — Server Action에서 호출 |
| **R-06** | NFC vs NFD 분리 (한글 닉네임/조합명) | 검색 누락, dedup 실패 | Server Action 진입 zod schema에 `transform(s => s.normalize('NFC'))` |
| **R-10** | events 테이블 INSERT 폭주 | 1개월 후 인덱스 비대 | v1은 created_at b-tree만, 1개월 모니터링 후 partition by month (v1.5) |
| **R-15** | 세트 옵션 +2,500 시드 누락 | estimated_price 0원 표시 | `seed.sql`에 `세트여부` option_group + (price_delta=0 단품, +2500 세트) 명시 |
| **R-16** | reviews.source_type 우발 추가 | v2.2 Patch 2 위반, average_rating 헷갈림 | `0005_interactions.sql`에 `-- v2.2 Patch 2: source_type 컬럼 의도적으로 제거` 주석 |
| **R-20** | search_text alias 매칭 시점 | 검색 시 join은 비용 ↑, 일관성 ↓ | combo 등록 시 search_text 빌드에 alias 포함 (snapshot) |

## Next.js / PWA / 모노레포

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R-05** | Server Action POST를 SW가 가로챔 | mutation 실패, 디버깅 난해 | serwist runtimeCaching에 `method:'GET'` 필터 명시 |
| **R-07** | transpilePackages 누락 | apps/web 빌드 시 packages/* 모듈 해석 실패 | `next.config.mjs`에 `transpilePackages: ['@mzr/db','@mzr/ui']` |
| **R-19** | Edge runtime 모듈 호환성 | middleware에서 packages/db import 시 Node-only 모듈 폭발 | middleware는 `@supabase/ssr`만, packages/db 함수는 import 금지(고립) |

## 인증 / OAuth

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R-08** | handle_new_user trigger 실패 시 silent | auth.users 생성됐는데 app_users 없음 | trigger를 SECURITY DEFINER + EXCEPTION 시 events 테이블에 error 이벤트 INSERT (best-effort) + 첫 RSC 진입 시 fallback `ensureAppUserExists()` |
| **R-18** | 카카오 OAuth 닉네임 파싱 실패 | app_users.nickname NULL → UI 깨짐 | trigger에서 `coalesce(meta->'kakao_account'->'profile'->>'nickname', meta->>'name', '익명')` |
| **R-21** | OAuth 콜백 도메인 변경 시 재등록 | dev → prod 이전 시 로그인 안 됨 | 외부 작업 체크리스트에 명시 |

## 마일스톤 시퀀스

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R-11** | M1 RLS 회원 컨텍스트 검증 불가 (auth.uid() 없음) | M1 검증 단계 부정확 | M1 검증은 anon SELECT 차단만, 회원 IUD 검증은 M2 종료 후 통합 검증 |
| **R-12** | M3 toggleVote ↔ M4 의존 | M3 단독 머지 시 미완 액션 | M3에 `toggleVote` 포함(stats 갱신은 M4의 RPC 도입까지 best-effort), M4에서 RPC로 정식 |
| **R-13** | M5 등록 후 M7 승인 갭 | 본인 검수 흐름 단절 | M5에 `admin/approveCombo` 액션 포함(UI는 M7), 본인 admin 승격해 자체 승인 가능 |

## 디자인 / 컴플라이언스

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R-14** | 카드에 `<img>` 우발 사용 | PRD §11 위반 (공홈 핫링크 금지) | eslint custom rule: `apps/web/components/combo/**` 내 `<img>`, `next/image`, `style.background-image: url(http...)` 금지 |
| **R-17** | 클라이언트 사이드 에러 sink 부재 | production 버그 모니터링 구멍 | `window.onerror` + `unhandledrejection` → POST `/api/events` → events 테이블 type='client_error' |

---

## 우선순위

| 등급 | 정의 | 항목 |
|---|---|---|
| **P0 (코드 작성 전 적용)** | 이걸 잊으면 보안·데이터 무결성 즉시 깨짐 | R-01, R-02, R-03, R-04, R-06, R-09 |
| **P1 (M0~M2 안에 적용)** | 셋업·인증 단계에서 같이 처리 | R-05, R-07, R-08, R-14, R-19 |
| **P2 (M3~M5 안에 적용)** | 기능 구현하면서 자연스럽게 | R-10, R-11, R-12, R-13, R-15, R-16, R-18, R-20 |
| **P3 (M8~M9)** | 출시 직전·운영에서 | R-17, R-21 |
