-- ===================================================================
-- catalog_change_logs 멱등 인입 키
--
-- 크롤러/인입 스크립트 재실행 시 같은 pending 변경이 중복으로 쌓이지 않도록
-- source payload 기반 dedupe_key 를 저장한다. approved/ignored 이후 같은 변경이
-- 다시 감지되는 것은 운영 판단 대상이므로 pending 상태에만 unique 를 건다.
-- ===================================================================

alter table public.catalog_change_logs
  add column if not exists dedupe_key text;

create unique index if not exists catalog_change_logs_pending_dedupe_key_idx
  on public.catalog_change_logs (dedupe_key)
  where status = 'pending' and dedupe_key is not null;

comment on column public.catalog_change_logs.dedupe_key is
  '크롤러 인입 멱등성 키. pending 중복 방지용이며 approved/ignored 이후 재감지는 허용';
