# ADR-06 — PR #1 변경 영향 + R-22~R-26 클로즈 + RLS spot-check

> 작성일: 2026-05-17 / 출처: PR #1 (commits `9a61e5f`, `f7c2436`, `edbbd47`, `a2ad199`, `e2681ce`)
> 본 ADR 은 PR #1 의 모든 변경을 한 곳에 정리하고, R-22~R-26 위험 신규 클로즈와 출시 전 매뉴얼 spot-check 시나리오를 박는다.

---

## 1. PR #1 commit 요약 (5개)

| 해시 | 메시지 | 주제 |
|---|---|---|
| `9a61e5f` | `chore(infra): @supabase/ssr 0.10.3 + CI + R-17 글로벌 sink + pg_dump 백업 (PR-1)` | 보안·자동화 인프라 |
| `f7c2436` | `feat(auth): 카카오 비즈앱 account_email scope + PIPA §15 4요소 (PR-2)` | 카카오 비즈앱 통합 |
| `edbbd47` | `feat(M3~M9): 조합 상세/인터랙션/등록/검색/관리자/PWA/약관 풀스택 구현` | M3~M9 풀스택 통합 |
| `a2ad199` | `feat(M6 home): 카테고리 홈 교체 + 오늘의 인기 + ComboCard 브랜드 라벨` | M6 잔여 |
| `e2681ce` | `feat(M8 pwa): Serwist /combo/* StaleWhileRevalidate + offline fallback` | M8 잔여 |

총 변경량: ~100 파일, +1700/-700 line (대부분 lockfile + M3~M9 신규 코드).

## 2. 위험 매트릭스 — 신규 클로즈

| ID | 위험 | 본 PR 처리 | 추가 검증 |
|---|---|---|---|
| **R-17** | client_error sink 부재 | `apps/web/components/analytics/ClientErrorSink.tsx` 신설 + `layout.tsx` 최상단 마운트. `window.onerror` + `unhandledrejection` 핸들러로 `events.client_error` sink (4KB cap pre-truncate, 무한 루프 방어) | dev 실행 후 `throw new Error('test')` 또는 `Promise.reject` 강제 발생 → `events` 테이블에 `client_error` row 도착 확인 |
| **R-22** | events anon INSERT 무제한 | `20260516000001_rls_rpc_hardening.sql` 의 `insert_event()` RPC + `pg_column_size(payload) < 4096` check (기존 `20260510000001_security_hardening.sql:16`). `app/api/events/route.ts` 가 zod 로 게이트 | anon key 로 `events.insert()` 직접 호출 시 권한 거부 확인. payload 5KB 시 INSERT 거부 확인 |
| **R-23** | 카카오 비즈앱 검수 누락 | 사용자 직접 카카오 developers 콘솔에서 비즈앱 전환 + 동의항목 검수 완료. `AuthModalProvider.tsx:241` scopes 에 `account_email` 추가. `20260518000002_handle_new_user_email.sql` 폴백 체인 | Supabase Dashboard scope 갱신 후 신규 가입 → `app_users.email` 에 값 들어옴 확인 |
| **R-24** | Supabase 백업을 프로젝트 내부에만 의존 | `.github/workflows/db-backup.yml` 매일 KST 04:00 pg_dump (postgresql-client-17) + 7일 artifact + Discord 알림. Supabase 자동 백업과 별개로 오프사이트 복구 사본을 유지 | 1회 수동 트리거(`gh workflow run db-backup.yml`) 성공 + artifact 다운로드 확인 |
| **R-26** | error.tsx / not-found.tsx 부재 | `apps/web/app/{error,not-found}.tsx` 신설 (M3~M9 commit). 추가로 `apps/web/app/offline/page.tsx` (Serwist fallback) | DB 실패 강제 → `error.tsx` 표시. 존재 X URL → `not-found.tsx`. SW 활성 + 오프라인 → `/offline` |

## 3. 위험 매트릭스 — 남은 위험 (출시 후 모니터링)

| ID | 위험 | 상태 | 액션 |
|---|---|---|---|
| R-04 | service_role 클라이언트 누출 | eslint 룰 ✅, **빌드 후 grep 미실행** | M9 직전 `pnpm build` 후 `pnpm audit:service-role` 1회 |
| R-11 | 회원 RLS 매트릭스 | 단발 spot-check 만 | §5 spot-check 4건 1회 실행, 출시 후 첫 주 모니터링 |
| R-21 | OAuth redirect 도메인 갱신 | 도메인 미결정 | M9 도메인 결정 시 Supabase + 카카오·구글 콘솔 redirect URL 갱신 |
| R-25 | iOS Safari ITP 7일 cookie | 미실측 | 출시 후 첫 주 iOS standalone 7일 후 `mzr_sid` 유지 확인 |

## 4. ssr 0.10 마이그레이션 사후 정리

- `createServerClient<Database, 'public'>` 형식 — v0.5 의 3번째 type arg `Database['public']` 제거
- `setAll: (toSet, headers)` — 2번째 인자 `headers` 추가. RSC/Server Action 에서는 무시, middleware 에서는 `NextResponse.headers.set(name, value)` 로 직접 적용 (CDN 인증 응답 캐싱 차단)
- 영향 파일: `apps/web/lib/supabase/{server,browser}.ts`, `apps/web/middleware.ts`
- 향후 v0.10 → v0.11+ 업그레이드 시 `setAll` 시그니처 변경 확인 필수

## 5. 회원 RLS spot-check 시나리오 (R-11 단발 검증)

머지 후 1회 실행. Supabase SQL Editor 에서 `set session role`/`request.jwt.claim` 으로 모의:

### 5.1 회원 A 가 회원 B 의 후기 수정 시도 → 차단
```sql
-- 회원 B 가 작성한 후기 row
select id, user_id from public.reviews where user_id = '<B-uuid>' limit 1;
-- 회원 A 로 session 전환 후 UPDATE 시도
set local "request.jwt.claims" = '{"sub":"<A-uuid>","is_admin":"false"}';
update public.reviews set content = 'hacked' where id = '<B-review-id>';
-- 기대: 0 rows affected (RLS reviews_update_self 차단)
```

### 5.2 일반 회원이 본인 role 을 'admin' 으로 self-update 시도 → 차단
```sql
set local "request.jwt.claims" = '{"sub":"<A-uuid>","is_admin":"false"}';
update public.app_users set role = 'admin' where id = '<A-uuid>';
-- 기대: exception 'app_users.role/status 는 관리자 또는 service_role 만 변경할 수 있습니다.'
```

### 5.3 본인이 pending 상태의 자기 조합을 published 로 self-update → 차단
```sql
set local "request.jwt.claims" = '{"sub":"<A-uuid>","is_admin":"false"}';
update public.combos set status = 'published' where creator_id = '<A-uuid>' and status = 'pending';
-- 기대: 0 rows (combos_update_self_pending 가 pending → pending 만 허용)
```

### 5.4 anon 이 events 테이블 직접 INSERT → 차단
```sql
set local role anon;
insert into public.events (user_id, session_id, type, payload)
values (null, 'fake', 'client_error', '{}'::jsonb);
-- 기대: 권한 거부 (revoke insert on events from anon)
-- 정상 경로는 insert_event(p_session_id, p_type, p_payload) RPC
```

## 6. 출시 전 매뉴얼 체크리스트

머지 직후 (사용자 책임):
- [ ] Supabase Dashboard > Auth > Providers > Kakao > Scopes 에 `account_email` 추가
- [ ] `pnpm db:push` (또는 SQL Editor) 로 마이그레이션 14건 적용
- [ ] GitHub Actions secrets 등록: `SUPABASE_DB_URL`, `DISCORD_WEBHOOK_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `.env.local` 생성 (README §2 11개 키)
- [ ] db-backup.yml 1회 수동 트리거 → artifact 다운로드 확인 (R-24)
- [ ] 본인 admin 승격 SQL 1회 — `update app_users set role='admin' where id='<my-uid>';`

M9 출시 직전:
- [ ] `LEGAL_OPERATOR_*` 5개 env 채움
- [ ] 약관·개인정보처리방침 변호사 1회 검토
- [ ] 매장 1회 메뉴 가격 검증 (PRD §13)
- [ ] 60개 시드 조합 입력 — `/admin/seed` UI (`docs/seed-combos-template.md` 참조)
- [ ] 도메인 + Vercel prod 연결
- [ ] 카카오·구글 OAuth redirect URL 갱신 (R-21)
- [ ] `pnpm build` 후 `pnpm audit:service-role` (R-04 빌드 후 grep)
- [ ] Lighthouse PWA 90+ 실측 (M8 sw.ts 동작 확인)
- [ ] 회원 RLS spot-check §5 4건 1회 실행 (R-11)

## 7. 향후 결정 (Supersede 후보)

- **events_type enum → text + check** — ALTER TYPE 부담 회피 (plan §18.3.7 v1.5 검토)
- **Next.js 16.x 마이그레이션** — middleware → proxy 리네임, Turbopack 안정성 확인 후 v1.5
- **Tailwind v4 + shadcn CLI v4** — 마이그레이션 비용 vs 이득 비교 후 v1.5
- **Plausible 도입** — 출시 후 1만 PV/월 도달 시 검토 (plan §18.4.1)
- **iOS ITP 대응 localStorage 백업** — R-25 출시 후 첫 주 데이터 보고 결정

---

**갱신 정책**: 본 ADR 의 결정이 번복되면 새 ADR (07~) 추가하고 상단에 `> Superseded by ADR-XX (날짜)` 표기. 출시 후 KPI 데이터 기반 결정은 별도 ADR.
