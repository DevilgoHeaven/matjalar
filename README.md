# 맛잘알 (matjalar)

> 프랜차이즈 메뉴와 꿀조합을 사람들이 직접 등록·검증하는 모바일 위키.
> v1: 서브웨이 1개 브랜드, 60개 시드 조합으로 출시.

## 문서

- **PRD (Product Requirements Document)**: [`PRD.md`](./PRD.md) — v2.1 + v2.2
- **구현 계획 (plan)**: `~/.claude/plans/prd-md-inherited-muffin.md` (개발자 로컬 사본)
- **의사결정 기록 (ADR)**: [`docs/decisions/`](./docs/decisions/)
  - `00-index.md` — 인덱스
  - `01-interview-log.md` — 12개 영역 인터뷰 결정
  - `02-risk-mitigation.md` — 위험·완화 매트릭스 (R-01~R-21)
  - `03-event-naming.md` — events 테이블 type enum + KPI 매핑
  - `04-references.md` — 출처 인덱스 (CVE, 공식 문서, 커뮤니티)
  - `05-coding-conventions.md` — 한글 주석 정책 + 모듈화 + 네이밍

## 기술 스택

- 프론트: Next.js 15.2.3+ (CVE 패치) + TypeScript + Tailwind + shadcn/ui (PWA)
- 인증: Supabase Auth (카카오·구글)
- DB: Supabase Postgres + RLS + PGroonga(한국어 검색) + Custom Access Token Hook
- 모노레포: Turborepo + pnpm workspaces
- 배포: v1 Vercel + Supabase Cloud / 추후 AWS

## 디렉터리

```
apps/web/        # Next.js 메인 + /admin 라우트
packages/db/     # Supabase 타입 + pure logic (combo summary/price/signature)
packages/ui/     # 디자인 토큰 + shadcn primitives
packages/config/ # eslint, tsconfig, tailwind preset
supabase/        # migrations/, seed.sql
docs/decisions/  # ADR
```

## 개발 시작

```bash
# 1) 의존성 설치
pnpm install

# 2) Supabase 로컬 link (외부 작업: 콘솔에서 프로젝트 생성 후)
supabase init
supabase link --project-ref <PROJECT_REF>

# 3) DB 타입 생성
pnpm db:types

# 4) 개발 서버
pnpm dev
```

## 주요 외부 작업 (사용자 책임)

`docs/decisions/01-interview-log.md` 와 plan §11 참조.

- Supabase Cloud 프로젝트 생성 + PGroonga 익스텐션 enable
- 카카오·구글 OAuth 앱 등록 (redirect=`${SUPABASE_URL}/auth/v1/callback`)
- Custom Access Token Hook 활성화 (role → is_admin claim)
- Discord webhook URL 발급
- Plausible 계정 생성
- 도메인 구입 (M9)
- 약관·개인정보처리방침 작성

## 라이선스

본 프로젝트는 사용자(@DevilgoHeaven) 개인 프로젝트입니다.
