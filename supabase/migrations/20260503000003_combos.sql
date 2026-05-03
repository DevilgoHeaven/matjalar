-- ===================================================================
-- 0003_combos.sql
-- 조합 본체 + 옵션 스냅샷 + 태그 (PRD §7 조합 4개 테이블)
-- ===================================================================

-- ===================================================================
-- combos — 조합 카드 본체
-- ===================================================================
create table public.combos (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            uuid not null references public.brands(id) on delete restrict,
  primary_menu_id     uuid not null references public.menus(id) on delete restrict,
  -- v2.1: 메뉴 변형 (사이즈/형태) — 가격 계산 base
  menu_variant_id     uuid not null references public.menu_variants(id) on delete restrict,
  -- 조합 등록자 (M2 인증 후 app_users 와 연결됨)
  -- 0004 마이그레이션에서 references public.app_users(id) 추가
  creator_id          uuid,

  -- 카드 한 줄 요약 (서버에서 buildCardSummary 로 생성, N+1 회피)
  card_summary        text not null,
  -- 조합명 (사용자 입력, 예: '실패없는 BMT 정석')
  title               text not null,

  -- 자동 계산된 예상 가격 (calculateEstimatedPrice 결과)
  estimated_price     integer not null default 0 check (estimated_price >= 0),
  -- 가격 신뢰도 — exact(공홈 검증)/approx(추정)/unknown
  price_status        text not null default 'approx'
                      check (price_status in ('exact', 'approx', 'unknown')),

  -- 대표 후기 ID (review_votes 가장 높은 것, 인-리퀘스트 갱신)
  -- 0005 에서 references reviews(id) 추가
  featured_review_id  uuid,

  -- v2.1+v2.2 운영자 추천 메모 (140자) — 실제 후기 없을 때 카드 보강 문구
  seed_comment        varchar(140),

  -- v2.1 SHA-256 hex 서명 (combo-signature.ts 출력) — 중복 감지용
  combo_signature     varchar(255),

  -- PGroonga 검색 인덱스용 — 조합 등록 시 alias 포함하여 빌드 (R-20)
  search_text         text not null default '',

  -- 조합 상태 — pending(승인대기)/published/hidden/rejected
  status              text not null default 'pending'
                      check (status in ('pending', 'published', 'hidden', 'rejected')),
  rejected_reason     text,
  published_at        timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table  public.combos is 'PRD §7 combos — 조합 카드 본체. 파생 필드는 Server Action 에서 계산 후 INSERT';
comment on column public.combos.combo_signature is 'SHA-256 hex (combo-signature.ts) — UNIQUE 강제 X (PRD §7 v2.2: 유사 조합 경고만)';
comment on column public.combos.search_text is 'PGroonga 검색용 — 등록 시 메뉴명+옵션명+alias 포함 빌드 (R-20)';

create index combos_brand_status_idx       on public.combos (brand_id, status);
create index combos_signature_idx          on public.combos (combo_signature);
create index combos_published_at_desc_idx  on public.combos (published_at desc nulls last);

create trigger set_updated_at_combos before update on public.combos
  for each row execute function public.set_updated_at();

-- ===================================================================
-- combo_options — 조합 옵션 스냅샷 (PRD §7 핵심 설계 #1)
-- 옵션 단종/변경되어도 조합 카드는 그대로 유지되도록 snapshot 저장
-- ===================================================================
create table public.combo_options (
  id                    uuid primary key default gen_random_uuid(),
  combo_id              uuid not null references public.combos(id) on delete cascade,
  -- 원본 참조 (단종 가능, NULL 허용)
  option_group_id       uuid references public.option_groups(id) on delete set null,
  option_item_id        uuid references public.option_items(id) on delete set null,

  -- 핵심: 옵션 행위 종류 — select(선택)/exclude(빼기)/add(추가)
  action_type           text not null
                        check (action_type in ('select', 'exclude', 'add')),
  quantity              integer not null default 1 check (quantity >= 1),

  -- 스냅샷 — 원본이 사라져도 카드 표시·서명 재계산 가능
  group_name_snapshot   text not null,
  option_name_snapshot  text not null,
  price_delta_snapshot  integer not null default 0,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now()
);

comment on table public.combo_options is 'PRD §7 combo_options — snapshot 패턴으로 옵션 단종/변경에도 조합 유지';

create index combo_options_combo_idx on public.combo_options (combo_id);

-- ===================================================================
-- tags — 매운맛/초보추천/가성비 등
-- ===================================================================
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  -- 영문 슬러그
  slug        text not null unique,
  -- 한국어 라벨
  label       text not null,
  emoji       text,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ===================================================================
-- combo_tags — 조합 ↔ 태그 M:N
-- ===================================================================
create table public.combo_tags (
  combo_id  uuid not null references public.combos(id) on delete cascade,
  tag_id    uuid not null references public.tags(id) on delete cascade,
  primary key (combo_id, tag_id)
);

create index combo_tags_tag_idx on public.combo_tags (tag_id);
