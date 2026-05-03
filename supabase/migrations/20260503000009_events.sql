-- ===================================================================
-- 0009_events.sql
-- KPI 이벤트 테이블 + type enum (PRD §15 / docs/decisions/03-event-naming.md)
-- ===================================================================

-- 이벤트 종류 enum — type 컬럼 강제. 새 종류 추가 시 ALTER TYPE 마이그레이션.
create type public.events_type as enum (
  'page_view',
  'list_view',
  'detail_view',
  'login_modal_open',
  'login_completed',
  'vote_click',
  'bookmark_click',
  'review_submit',
  'combo_register_started',
  'combo_register_submitted',
  'client_error',
  'report_submit'
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  -- 로그인 사용자면 채워짐, 비회원이면 NULL
  user_id     uuid references public.app_users(id) on delete set null,
  -- 클라이언트 cookie 'mzr_sid' UUID (30 일 만료)
  session_id  text not null,
  type        public.events_type not null,
  -- 이벤트별 payload (자세한 스키마는 events.ts EventDescriptor)
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table  public.events is 'KPI 추적 이벤트 (events_type enum 강제)';
comment on column public.events.session_id is '클라이언트 cookie mzr_sid UUID';
comment on column public.events.payload is 'EventDescriptor.ts 와 1:1 — 새 이벤트 추가 시 enum + payload 타입 동시 갱신';

-- 시간 기반 인덱스 (KPI 집계 쿼리용)
create index events_created_at_idx on public.events (created_at desc);
create index events_type_idx       on public.events (type, created_at desc);
create index events_session_idx    on public.events (session_id);
create index events_user_idx       on public.events (user_id) where user_id is not null;

-- RLS — anon 도 INSERT 가능 (페이지뷰는 비회원도 기록), SELECT 는 admin only
alter table public.events enable row level security;

create policy "events_insert_anyone"
  on public.events for insert
  with check (true);

create policy "events_select_admin"
  on public.events for select
  using (auth.jwt()->>'is_admin' = 'true');

-- UPDATE/DELETE 차단 (감사 무결성)
-- 명시적 DENY 정책은 정의 안 하고, INSERT/SELECT 외에 정책 없으므로 자동 차단
