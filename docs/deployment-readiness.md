# 배포 readiness 체크리스트

> 기준일: 2026-05-25
> 목표: v1 Production 공개 전, 코드/데이터/운영/인증 게이트를 빠짐없이 통과한다.

## 2026-05-25 완료된 게이트

- [x] Vercel 프로젝트 생성/연결: `matjalar`, Root Directory `apps/web`
- [x] Vercel Production 배포: `https://matjalar.vercel.app`
- [x] Vercel Production/Preview/Development Supabase env 등록
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [x] Vercel Production env 등록: `NEXT_PUBLIC_SITE_URL=https://matjalar.vercel.app`
- [x] Vercel/Turbo build env 경고 제거: `turbo.json` `build.env` 명시
- [x] GitHub Actions Supabase secrets 등록/재등록
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [x] `pnpm --filter @mzr/web lint`
- [x] `pnpm --filter @mzr/web typecheck`
- [x] `pnpm test`
- [x] `pnpm --filter @mzr/web build`
- [x] `pnpm audit:service-role` 로 클라이언트 청크 service role 노출 없음 확인
- [x] `pnpm audit --audit-level=moderate` 통과. 현재 known vulnerabilities 0건.
- [x] `pnpm --filter @mzr/web seed:combos -- --dry-run`: 60개 검증, insert 0, 기존 60개 확인
- [x] Supabase migration list 및 `supabase db push --dry-run`: remote DB up to date
- [x] 원격 Supabase RLS 스팟 검증: 익명 events insert 차단, 타인 review 수정 차단, self role 승격 차단, member pending combo publish 차단
- [x] Playwright 캡처 QA
  - 로컬 production server: `.captures/uiux-20260525-001126`
  - Vercel Production URL: `.captures/uiux-20260525-003611`
  - 각 18페이지, 34개 동작 체크, failures 0, console/page errors 0, mobile small touch targets 0
- [x] GitHub PR CI 통과 확인: Typecheck + Lint + Test, Security audit (high)

## 남은 출시 차단 항목

- [ ] 법적 고지 실명 정보 확정 및 Vercel Production env 등록
  - `LEGAL_OPERATOR_NAME`
  - `LEGAL_OPERATOR_EMAIL`
  - `LEGAL_OPERATOR_ADDRESS`
  - `LEGAL_PRIVACY_OFFICER_NAME`
  - `LEGAL_PRIVACY_OFFICER_EMAIL`
- [ ] `SUPABASE_DB_URL` GitHub Actions secret 등록
  - Supabase DB password 또는 Dashboard direct connection string 필요
- [ ] `DISCORD_WEBHOOK_URL` 발급 및 GitHub Actions secret 등록
- [ ] Supabase Auth URL Configuration
  - Site URL: `https://matjalar.vercel.app`
  - Redirect URLs: `https://matjalar.vercel.app/auth/callback`, `http://localhost:3000/**`, Vercel Preview wildcard
- [ ] Kakao/Google OAuth 콘솔에 Production callback 반영
- [ ] Kakao 비즈앱 `account_email` 동의항목 승인 확인
- [ ] 약관/개인정보처리방침 법률 검토
- [ ] 메뉴 가격 매장 1회 검증
- [ ] Vercel GitHub Login Connection 추가 후 repo 연결
  - 현재 CLI 배포는 성공했지만 GitHub 자동 Preview/Production 연동은 Vercel 계정의 GitHub Login Connection 부재로 실패함.
- [ ] 남은 출시 차단 항목 해소 후 PR merge
- [ ] PR merge 후 default branch에 추가된 catalog/db-backup workflow 수동 실행 또는 첫 스케줄 실행 확인

## 출시 차단 기준

- GitHub CI 또는 Vercel Preview build 실패
- `audit:service-role` 실패
- Production OAuth 로그인 후 pending action 재개 실패
- 일반 사용자가 admin/다른 사용자 데이터에 접근 가능한 RLS 실패
- 모바일 주요 화면에서 버튼 터치 불가, 텍스트 겹침, 콘솔 에러 발생
- 법적 고지 env 미설정 또는 운영자 정보 미확정
