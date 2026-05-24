# 배포 전 readiness 체크리스트

> 기준일: 2026-05-24
> 목표: v1 Production 공개 전, 코드/데이터/운영/인증 게이트를 빠짐없이 통과한다.

## 현재 에이전트가 완료할 수 있는 게이트

- [ ] 로컬 변경 리뷰 후 커밋/푸시
- [ ] GitHub PR CI 통과 확인
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @mzr/web build`
- [ ] `pnpm audit:service-role` 로 클라이언트 청크 service role 노출 없음 확인
- [ ] `pnpm --filter @mzr/web seed:combos -- --dry-run` 으로 60개 시드 중복/누락 확인
- [ ] Playwright 캡처 QA로 모바일/데스크톱 주요 화면과 버튼 동작 재검증
- [ ] Supabase migration 상태 확인 및 필요한 경우 적용

## 계정 콘솔 또는 실명 정보가 필요한 게이트

- [ ] Vercel 프로젝트 생성/연결: Root Directory `apps/web`
- [ ] Vercel Production/Preview env 등록
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `LEGAL_OPERATOR_NAME`
  - `LEGAL_OPERATOR_EMAIL`
  - `LEGAL_OPERATOR_ADDRESS`
  - `LEGAL_PRIVACY_OFFICER_NAME`
  - `LEGAL_PRIVACY_OFFICER_EMAIL`
- [ ] GitHub Actions secrets 등록
  - `NEXT_PUBLIC_SUPABASE_URL` 또는 `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL`
  - `DISCORD_WEBHOOK_URL`
- [ ] Supabase Auth URL Configuration
  - Site URL: Production URL
  - Redirect URLs: `https://<production-domain>/auth/callback`, `http://localhost:3000/**`, Vercel Preview wildcard
- [ ] Kakao/Google OAuth 콘솔에 Production callback 반영
- [ ] Kakao 비즈앱 `account_email` 동의항목 승인 확인
- [ ] `DISCORD_WEBHOOK_URL` 발급 후 catalog/backup 알림 수동 실행
- [ ] 약관/개인정보처리방침 법률 검토
- [ ] 메뉴 가격 매장 1회 검증

## 출시 차단 기준

- GitHub CI 또는 Vercel Preview build 실패
- `audit:service-role` 실패
- Production OAuth 로그인 후 pending action 재개 실패
- 일반 사용자가 admin/다른 사용자 데이터에 접근 가능한 RLS 실패
- 모바일 주요 화면에서 버튼 터치 불가, 텍스트 겹침, 콘솔 에러 발생
- 법적 고지 env 미설정 또는 운영자 정보 미확정

