# ADR-05 — 코딩 컨벤션 (한글 주석 정책 + 모듈화 + 네이밍)

> 작성일: 2026-05-02
> 본 문서는 맛잘알 v1 모든 코드의 작성 규칙이다. CI/eslint로 강제 가능한 부분은 강제하고, 그렇지 않은 부분은 PR 리뷰 체크리스트로 다룬다.

---

## 1. 주석 정책 — **모든 코드 한글 주석 명확히**

### 1.1 강제 사항
- **모든 export 함수·타입·상수**는 위에 한글 doc 주석을 단다 (1줄 이상)
- **WHY가 비자명한 코드**(분기 처리, 한국어 정규화, RLS 우회, race 회피, 타임존 처리 등)는 inline 한글 주석으로 의도를 남긴다
- **외부 출처를 참조한 패턴**(예: PGroonga `&@~` 연산자, NFC normalize)에는 출처 링크를 주석에 포함

### 1.2 양식

```ts
/**
 * 조합 카드의 한 줄 요약 텍스트를 만든다.
 *
 * 브랜드별로 템플릿이 다르며 (PRD §6 참조), 등록·수정 시 서버에서 한 번 계산해
 * combos.card_summary 컬럼에 저장한다(N+1 회피).
 *
 * @param brand        브랜드 정보 (template 결정용)
 * @param menuVariant  메뉴 + 사이즈/세트 변형 (BMT 15cm 등)
 * @param options      선택된 옵션 목록 (action_type별로 그룹핑됨)
 * @returns "BMT 15cm · 위트 · 랜치+사웨 외 2" 같은 한 줄 문자열
 */
export function buildCardSummary(
  brand: Brand,
  menuVariant: MenuVariant,
  options: ComboOption[]
): string {
  // PRD §6: 서브웨이 카드 요약 = "메뉴 · 사이즈 · 빵 · 소스(외 N)"
  // 다른 브랜드는 다른 템플릿 사용. 향후 brand.template_kind로 분기 확장.
  ...
}
```

### 1.3 금지 사항
- 자명한 코드에 대한 주석 (예: `// 변수에 1을 더한다`) — 노이즈
- 영어로만 된 주석 (외래어·약어 제외)
- 주석에 거짓 정보 또는 outdated 정보

---

## 2. 모듈화 — 유지보수가 쉬운 단위

### 2.1 디렉터리 책임 (Single Responsibility)

| 디렉터리 | 책임 | 외부 의존 가능 |
|---|---|---|
| `packages/db/src/lib/*.ts` | 순수 함수 (입력→출력만, 부수효과 없음) | TypeScript stdlib만 |
| `packages/ui/components/*.tsx` | UI primitives (shadcn 기반) | React, tailwind |
| `packages/config/*` | eslint, tsconfig, tailwind preset | (의존 없음) |
| `apps/web/lib/supabase/*` | Supabase 클라이언트 팩토리 | @supabase/ssr |
| `apps/web/components/**/*.tsx` | 도메인 컴포넌트 | packages/ui |
| `apps/web/app/actions/*.ts` | Server Actions (`'use server'`) | packages/db, lib/supabase |
| `apps/web/app/admin/*` | 관리자 페이지/액션 (service_role 사용 가능) | lib/supabase/admin |
| `apps/web/app/(public)|(auth)|(member)/*` | 일반 페이지 | service_role 금지 |

### 2.2 파일 크기 기준

- 한 파일 **300줄 초과 시 분리 검토**
- 컴포넌트 한 파일 **150줄 초과 시 분리 검토** (sub-component, custom hook)
- Server Action 한 함수 **80줄 초과 시 헬퍼 분리**

### 2.3 함수 분리 규칙

- 한 함수는 **한 가지 일**만 (parse / validate / compute / persist 분리)
- 부수효과 함수와 순수 함수는 같은 모듈에 두지 않는다 (테스트 용이성)
- DB 쿼리·외부 호출은 **항상 함수 경계** (mock 가능하게)

---

## 3. 네이밍

### 3.1 파일·디렉터리
- 파일: `kebab-case.ts` (예: `combo-summary.ts`, `auth-modal-provider.tsx`)
- 컴포넌트 파일: `PascalCase.tsx`도 허용 (예: `ComboCard.tsx`)
- 디렉터리: `kebab-case` (예: `combo`, `auth-callback`)

### 3.2 식별자
- 변수·함수: `camelCase`
- React 컴포넌트: `PascalCase`
- 상수(컴파일타임 고정): `UPPER_SNAKE_CASE` (예: `CATEGORY_TOKENS`)
- TypeScript 타입: `PascalCase` (예: `ActionDescriptor`)
- Server Action: 동사로 시작 (`registerCombo`, `toggleVote`, `addReview`)
- React Hook: `use`로 시작
- DB 컬럼: `snake_case` (Postgres 관례)
- 환경 변수: `UPPER_SNAKE_CASE` (예: `SUPABASE_SERVICE_ROLE_KEY`)

### 3.3 Boolean 네이밍
- `is*`, `has*`, `should*` prefix
- 예: `isLoading`, `hasError`, `shouldRevalidate`

### 3.4 한국어/영어 혼용
- 코드 식별자는 영어 (변수, 함수, 타입 등)
- 사용자 노출 문자열·주석은 한글
- DB enum 값은 영어 (`status`, `type` 등 — Postgres와 호환)
- 카테고리·태그 라벨은 한글로 노출(`label` 필드 별도)

---

## 4. TypeScript 규칙

- `strict: true` (tsconfig 강제)
- `any` 금지 (`unknown` 또는 명시적 타입)
- `as` 타입 단언은 zod·schema 검증 후에만
- import 경로: `@mzr/db`, `@mzr/ui`, `@mzr/config` (workspace 별칭)
- 상대 경로 import는 같은 디렉터리·하위 디렉터리만 (위로 가는 `../../` 회피)

---

## 5. React / Next.js 규칙

- 기본 컴포넌트는 **Server Component** (`'use client'` 명시 시에만 클라이언트)
- Server Action: 파일 최상단에 `'use server'`
- `'use client'`와 `'use server'`는 같은 파일에서 공존 금지 (분리)
- Hook은 `apps/web/hooks/` 또는 컴포넌트 파일 안 (재사용 안 되는 경우)
- 색상·간격은 디자인 토큰(`packages/ui/tokens`)만 사용 (인라인 hex 금지)
- `<img>`, `next/image` 사용 금지 (eslint custom rule 강제 — R-14)

---

## 6. SQL / Supabase 규칙

- 마이그레이션 파일명: `YYYYMMDD_NNNN_short_name.sql`
- 한 마이그레이션 = 한 의도(여러 테이블 변경이라도 같은 의도면 OK)
- RLS 정책 모든 테이블에 명시 (default-deny)
- 함수는 SECURITY DEFINER 명시적 사용 (역할 명확)
- enum 값 변경은 별도 마이그레이션
- `seed.sql`은 idempotent (반복 실행해도 동일 결과)

---

## 7. 테스트 규칙

- pure function: vitest 단위 테스트 필수 (`*.test.ts` 같은 디렉터리)
- 케이스: happy path 1 + edge case 2~3 (총 3~5개)
- mocking은 `vi.fn()` / `vi.spyOn()`만 (모듈 전체 mock 회피)
- 통합 테스트(인증, RLS)는 chrome-devtools-mcp로 매뉴얼 시나리오

---

## 8. 보안 규칙

- 클라이언트 코드에서 **`SUPABASE_SERVICE_ROLE_KEY` 절대 import 금지** (R-04)
- 환경변수 prefix: 클라이언트 노출은 `NEXT_PUBLIC_*`만 (정확히)
- 사용자 입력은 zod schema + NFC normalize (R-06)
- SQL injection 회피: 항상 매개변수 바인딩, raw SQL은 RPC 함수에만

---

## 9. Git 규칙

- 브랜치: `mile-MN-짧은설명` (예: `mile-M0-setup`)
- 커밋 prefix: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `db:`(마이그레이션)
- 커밋 메시지 1줄 한글 + 빈 줄 + 본문 (필요 시)
- 마일스톤 끝마다 `git tag mile-MN`

---

## 10. PR 리뷰 체크리스트

새 PR 머지 전:
- [ ] 한글 주석 누락 여부
- [ ] 파일·함수 크기 기준 위반 여부
- [ ] service_role 키 누출 여부 (grep)
- [ ] `<img>`, `next/image` 사용 여부 (eslint 통과 확인)
- [ ] zod NFC normalize 통과 여부 (한국어 입력 액션)
- [ ] RLS 정책이 새 테이블/컬럼에 반영됐는지
- [ ] events 이벤트가 새 액션에서 기록되는지
- [ ] 본 ADR과 plan 파일이 일치하는지
