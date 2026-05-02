# ADR-01 — 인터뷰 결정 로그 (12개 영역)

> 작성일: 2026-05-02 / 출처: plan §3
> 본 문서는 맛잘알 v1 구현의 12개 핵심 결정사항을 사용자 인터뷰로 확정한 기록이다.
> 각 항목은 **선택·이유·트레이드오프** 형식으로 정리되며, 향후 결정 번복 시 새 ADR로 처리한다.

---

## #1 로컬 DB 환경

- **선택**: Supabase Cloud 단일 dev project + supabase CLI link (마이그레이션·타입 생성용)
- **사용자 입장**: "인터넷 어차피 필요한 기본, 개인 프로젝트라 dev/prod 너무 안 신경"
- **트레이드오프**:
  - 인터넷 필수 → 기차·비행기에서 작업 불가
  - 마이그레이션을 SQL editor에서 임의 적용 가능 → drift 위험
- **완화**: CLI/migrations만 거치는 규율 + `supabase db diff`로 drift 탐지

## #2 레포 구조

- **선택**: Turborepo, `apps/web` 1개 + `/admin` 같은 앱 내 라우트
- **사용자 입장**: "1인 개발이라도 Claude Code 쓰니까 부담 적을 듯, 추후 AWS"
- **트레이드오프**: apps 분리 안 함으로 service_role 누출 위험 ↑
- **완화**: eslint no-restricted-imports + 빌드 후 grep 검사 이중

## #3 DB 마이그레이션 관리

- **선택**: `supabase/migrations/` 누적 + supabase CLI link
- **이유**: 스키마 변경 잦은 개발 단계 + git history에 변경 trace + 추후 prod 동일 적용
- **트레이드오프**: SQL editor 임의 적용 시 drift (위 #1과 같은 완화)

## #4 데이터 페칭 전략

- **선택**: RSC + Server Action + `useOptimistic`
- **이유**: KPI(따봉/찜 클릭률 30%)에 optimistic UI 필수, RSC로 SEO·초기 로드 확보
- **트레이드오프**: TanStack Query 미사용 → 다른 사용자 동시 mutation 시 즉시 sync 안 됨
- **완화**: Server Action 끝에 `revalidatePath()` 강제 + `onSuccess` 시 router.refresh()

## #5 클라이언트 상태 관리

- **선택**: React Context only (Zustand·Jotai 미사용)
- **이유**: RSC 위주라 클라이언트 글로벌 상태 거의 없음. AuthModal·Toast 정도만 필요

## #6 인증 흐름 (큐 패턴)

- **선택**: Context + sessionStorage 하이브리드
- **구체화**:
  - Context에 매핑된 함수 (런타임)
  - sessionStorage('mzr_pending')에 직렬화 가능한 ActionDescriptor만 백업
  - `supabase.auth.onAuthStateChange('SIGNED_IN')` → Server Action에서 `getSession()` 명시 호출 → descriptor → 매퍼 → 실제 액션 실행
- **트레이드오프**: 새로고침 시 sessionStorage 휘발(IndexedDB/localStorage 대안 있으나 v1에 과함)
- **이유**: UX는 "다시 누르세요"로 자연스러움

## #7 파생 필드 계산 위치

- **선택**: v1 Server Action(TS), v2 무결성 trigger 추가 옵션
- **사용자 명시**: "1번이 v1, 혼합이 v2"
- **revised**: combo_stats 카운터만은 race 위험으로 v1부터 RPC 함수(SECURITY DEFINER) — Server Action이 호출. card_summary/estimated_price/combo_signature는 그대로 TS Server Action에서 계산

## #8 첫 로그인 + service_role

- **선택**: Postgres trigger `handle_new_user` + service_role은 /admin Server Action에서만
- **revised**: 관리자 권한 체크는 `is_admin()` SQL 함수 대신 **`auth.jwt()->>'is_admin'` JWT claim**(Custom Access Token Hook이 채움) — 함수 재귀·성능 위험 회피

## #9 PWA

- **선택**: `@serwist/next` + manifest.json (Next.js 15 호환 검증됨)
- **추가**: `/combo/[id]` StaleWhileRevalidate 캐시. Server Action POST 가로채기 금지(serwist runtimeCaching에 method='GET' 필터 명시)

## #10 시드 입력 도구

- **선택**: 옵션·메뉴 SQL seed + 60 조합은 `/admin/seed` UI 하이브리드 (사용자 명시 1+4)
- **추가**: `/admin/seed`는 M5 등록 폼 재사용 + admin 모드(`adminOverride=true`) → `registerCombo` 후 즉시 `approveCombo`. seed_comment 필드 필수

## #11 타입 자동 생성

- **선택**: npm script + lefthook pre-commit
- **이유**: 마이그레이션 후 타입 즉시 갱신, CI 부담 X

## #12 테스트/모니터링

- **선택**: 최소 (vitest 단위 + Discord webhook + 호스팅 로그)
- **revised**: client onerror/unhandledrejection을 events 테이블에 sink 추가. Sentry는 v1.5

---

## 인터뷰 후 발견·결정

| 영역 | 결정 | 출처 |
|---|---|---|
| 검색 | pg_trgm → **PGroonga** (한국어 형태소) | 서브에이전트 RLS 조사, Supabase 공식 supported extension v4.0.6 (2026-04 release) |
| 분석 도구 | events SOT + Plausible 보조 | 사용자 답변(1+3 절충안) |
| 디자인 토큰 | 7 카테고리 컬러·이모지·폰트 즉시 못 박음 | 사용자 답변 |
| AWS 타깃 | v1 보류, 출시 후 별도 PR | 사용자 답변 |
| Next.js 버전 | **15.2.3+ 강제 핀** | CVE-2025-29927 patch (CVSS 9.1, middleware bypass) |

---

**다음 결정 변경 발생 시**: `06-...md` 형식으로 새 ADR 추가하고 본 문서 상단에 `> Superseded by ...` 표기.
