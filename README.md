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

- 프론트: Next.js 15.5.18+ (CVE 패치) + TypeScript + Tailwind + shadcn/ui (PWA)
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
scripts/         # 운영·검증 스크립트
```

## 개발 시작

### 1) 의존성 설치

```bash
pnpm install
```

### 2) `.env.local` 생성 (필수)

루트(`C:\workspace\맛잘알\.env.local`)에 다음 11개 키를 채웁니다. 템플릿은 `.env.example` 참조.

```bash
# === Supabase (필수) ===
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # ⚠️ 서버 전용 — NEXT_PUBLIC_ prefix 절대 금지

# === 운영 알림 (선택, M8 직전에 채움) ===
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# === 분석 (v1.5, 비워둬도 됨) ===
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=

# === 사이트 메타 ===
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # production 은 도메인으로 교체

# === 법적 고지 (M9 출시 직전 필수) ===
LEGAL_OPERATOR_NAME=
LEGAL_OPERATOR_EMAIL=
LEGAL_OPERATOR_ADDRESS=
LEGAL_PRIVACY_OFFICER_NAME=
LEGAL_PRIVACY_OFFICER_EMAIL=
```

키 발급 위치:
- **Supabase URL / anon key / service_role key**: Supabase Dashboard > Project Settings > API
- **Discord webhook URL**: Discord 서버 채널 > 통합 > 웹후크 > 새 웹후크
- **Plausible 도메인**: plausible.io 가입 후 site 등록 (v1.5 이전엔 비워두면 됨)

🚨 **보안 경고**:
- `SUPABASE_SERVICE_ROLE_KEY` 는 RLS 를 우회하므로 **절대 `NEXT_PUBLIC_` prefix 붙이지 말 것**. R-04 위험.
- `.env.local` 은 이미 `.gitignore` 처리됨. 커밋되지 않는지 한 번 더 확인.
- 빌드 후 클라이언트 청크에 service_role 누출 검사: `pnpm audit:service-role` (R-04 자동 검증)

### 3) Supabase 로컬 link (외부 작업: Supabase Cloud 콘솔에서 프로젝트 생성 후)

```bash
corepack pnpm dlx supabase@2.98.0 init
corepack pnpm dlx supabase@2.98.0 link --project-ref <PROJECT_REF>
```

### 4) DB 타입 생성

```bash
pnpm db:types
```

### 5) 개발 서버

```bash
pnpm dev
```

## 운영 스크립트

```bash
# 빌드 후 service_role 문자열이 클라이언트 청크에 들어갔는지 검사
pnpm audit:service-role

# local Supabase DB 권한 불변식 검사
pnpm audit:db-security

# 써브웨이 공식 페이지를 읽어 catalog_change_logs 인입 JSON 생성
pnpm catalog:crawl -- --output ./.omc/subway-catalog.json

# 크롤러 산출물 JSON을 catalog_change_logs 승인 큐로 인입
pnpm catalog:ingest -- --file docs/catalog-change-sample.json --dry-run
pnpm catalog:ingest -- --file docs/catalog-change-sample.json

# 크롤러 실행 결과를 Discord incoming webhook 으로 알림
pnpm catalog:notify -- --file ./.omc/subway-catalog.json
```

`catalog:crawl`은 공홈 HTML을 현재 Supabase 카탈로그와 비교해 변경 후보 JSON만 생성합니다. 이미지 다운로드/핫링크와 production 테이블 직접 반영은 하지 않습니다. 삭제/단종 후보는 대량 오탐 위험이 있어 기본으로 생성하지 않으며, 필요할 때만 `--include-missing`을 붙여 수동 검토합니다.

`catalog:ingest`는 `SUPABASE_SERVICE_ROLE_KEY`가 필요하므로 서버/로컬 운영 환경에서만 실행합니다.
같은 pending 변경은 `dedupe_key`로 중복 인입되지 않습니다. 실제 production 반영은 `/admin/catalog-changes`에서 관리자가 승인해야 합니다.

`.github/workflows/catalog-crawl.yml`은 매일 18:00 UTC(03:00 KST)에 같은 크롤러를 실행하고, 결과를 승인 큐에 넣은 뒤 Discord로 요약을 보냅니다. GitHub Actions repository secrets에는 다음 값을 등록해야 합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DISCORD_WEBHOOK_URL=
```

`SUPABASE_URL` secret을 별도로 두면 `NEXT_PUBLIC_SUPABASE_URL` 대신 사용할 수 있습니다. workflow는 crawler output 이 `status='failed'`인 selector_error 도 먼저 인입/알림한 뒤 최종 job 을 실패 처리합니다.

## 법적 고지

`/terms`, `/privacy`는 출시 전 운영 초안입니다. 공개 전 `.env.local` 또는 배포 환경에 다음 값을 실제 정보로 채우고 법률 검토를 거쳐야 합니다.

```bash
LEGAL_OPERATOR_NAME=
LEGAL_OPERATOR_EMAIL=
LEGAL_OPERATOR_ADDRESS=
LEGAL_PRIVACY_OFFICER_NAME=
LEGAL_PRIVACY_OFFICER_EMAIL=
```

## 주요 외부 작업 (사용자 책임)

`docs/decisions/01-interview-log.md` 와 plan §11 참조.

- Supabase Cloud 프로젝트 생성 + PGroonga 익스텐션 enable
- 카카오·구글 OAuth 앱 등록 (redirect=`${SUPABASE_URL}/auth/v1/callback`)
- **카카오 비즈앱 전환 + `account_email` 동의항목 검수** (영업일 3~5일)
  - 카카오 developers > 내 애플리케이션 > 비즈앱 전환
  - 동의항목 > 카카오계정(이메일) > "선택 동의"로 신청
  - 검수 완료 후 Supabase Dashboard > Auth > Providers > Kakao > Scopes 에 `account_email` 추가
- Custom Access Token Hook 활성화 (role → is_admin claim)
- Discord webhook URL 발급 + GitHub Actions secret 등록 (`DISCORD_WEBHOOK_URL`)
- **GitHub Actions secrets 등록** (자동 백업·크롤·CI 용)
  - `NEXT_PUBLIC_SUPABASE_URL` (또는 `SUPABASE_URL`)
  - `SUPABASE_SERVICE_ROLE_KEY` (catalog-crawl 용)
  - `SUPABASE_DB_URL` — Supabase Dashboard > Project Settings > Database > Connection string (direct, :5432) — **db-backup.yml 일일 오프사이트 백업용**
  - `DB_BACKUP_GPG_PASSPHRASE` — db-backup artifact 암호화용
  - `DISCORD_WEBHOOK_URL`
- Plausible 계정 생성 (v1.5)
- 도메인 구입 (M9)
- 약관·개인정보처리방침 실제 운영 정보 반영 + 법률 검토 (PIPA §15 4요소: 목적/항목/보유기간/동의 거부권)

## 라이선스

본 프로젝트는 사용자(@DevilgoHeaven) 개인 프로젝트입니다.
