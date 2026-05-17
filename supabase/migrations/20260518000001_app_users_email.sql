-- ===================================================================
-- 20260518000001_app_users_email.sql
-- app_users.email 컬럼 추가 — 카카오 비즈앱 account_email scope 대응
--
-- 배경: PR-2 카카오 비즈앱 전환 후 account_email 동의항목을 받을 수 있게 됨.
-- 이메일은 운영 공지, 비밀번호 없는 계정 복구 단서, 통계용으로 보관.
--
-- 정책:
--  - NULL 허용 (검수 전 가입자, 동의 거부 케이스, 미인증 카카오 이메일)
--  - UNIQUE 제약 ❌ — 카카오 이메일은 미인증 가능성이 있어 충돌 시 trigger 가 silent 실패할 수 있음
--  - 부분 인덱스만 (email IS NOT NULL) — 조회 시 NULL 다수 회피
-- ===================================================================

alter table public.app_users
  add column if not exists email text;

comment on column public.app_users.email is
  '카카오 account_email 또는 구글 email 에서 추출. NULL 허용. 비즈앱 검수 전 가입자 또는 사용자가 선택 동의 거부한 경우 NULL.';

create index if not exists app_users_email_idx
  on public.app_users (email) where email is not null;
