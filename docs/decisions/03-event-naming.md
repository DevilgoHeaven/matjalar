# ADR-03 — events 테이블 type enum + KPI 매핑

> 작성일: 2026-05-02 / 출처: plan §8
> events 테이블의 `type` 컬럼은 enum으로 못 박아 KPI 계산 시 이름 충돌 방지한다.
> 새 이벤트 추가 시 본 문서 + 마이그레이션 동시 갱신 필수.

---

## events_type enum 정의

```sql
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
  'order_copy',
  'share_click',
  'ranking_view',
  'quiz_result_share',
  'client_error',
  'report_submit'
);
```

## type → 발생 위치 → KPI 매핑

| `events_type` | 발생 위치 | KPI 매핑 (PRD §15) |
|---|---|---|
| `page_view` | 모든 페이지 RSC entry | 순방문자 (distinct session_id) |
| `list_view` | `/`, `/brand/[slug]`, `/search` 진입 | 분모(상세 진입률) |
| `detail_view` | `/combo/[id]` 진입 | 분자(상세 진입률 = detail_view / list_view) |
| `login_modal_open` | 비회원이 인터랙션 버튼 클릭 → 모달 노출 | 로그인 버튼 클릭률 = login_modal_open / list_view |
| `login_completed` | onAuthStateChange('SIGNED_IN') | 로그인 완료율 = login_completed / login_modal_open |
| `vote_click` | toggleVote 호출 (회원 전용) | 따봉 클릭률(로그인 사용자) |
| `bookmark_click` | toggleBookmark 호출 (회원 전용) | 찜 클릭률 |
| `review_submit` | addReview 성공 (회원 전용) | 한 줄 후기 작성률 |
| `combo_register_started` | /combo/new 첫 진입 | 조합 등록 시도 분모 |
| `combo_register_submitted` | registerCombo 성공 | 조합 등록 시도 분자 |
| `order_copy` | 조합 상세 주문문 복사 | 매장 앞 실사용 의도 |
| `share_click` | 조합/랭킹/퀴즈 공유 버튼 | 외부 공유 시도 |
| `ranking_view` | /rankings 진입 | 가성비·초보추천 랭킹 관심 |
| `quiz_result_share` | 취향 퀴즈 결과 공유 | 결과형 바이럴 루프 |
| `client_error` | window.onerror, unhandledrejection | 에러 모니터링 (R-17) |
| `report_submit` | submitReport 호출 | 신고 통계 |

## payload jsonb 스키마 (이벤트별)

```ts
type EventPayload =
  | { type: 'page_view',             pathname: string, referrer?: string }
  | { type: 'list_view',             list_kind: 'home' | 'brand' | 'search', count: number }
  | { type: 'detail_view',           combo_id: string }
  | { type: 'login_modal_open',      action_type: 'bookmark' | 'vote' | 'review' | 'register' | 'report', combo_id?: string }
  | { type: 'login_completed',       provider: 'kakao' | 'google' }
  | { type: 'vote_click',            combo_id: string, after: 'on' | 'off' }
  | { type: 'bookmark_click',        combo_id: string, after: 'on' | 'off' }
  | { type: 'review_submit',         combo_id: string, rating: number }
  | { type: 'combo_register_started' }
  | { type: 'combo_register_submitted', combo_id: string }
  | { type: 'order_copy',            combo_id: string, source: 'detail' | 'quiz' }
  | { type: 'share_click',           target_type: 'combo' | 'ranking' | 'quiz_result', target_id?: string, channel: 'native' | 'clipboard' | 'kakao' | 'image' | 'fallback' }
  | { type: 'ranking_view',          ranking_kind: string, count: number }
  | { type: 'quiz_result_share',     result_kind: string, combo_id?: string }
  | { type: 'client_error',          message: string, stack?: string, url?: string }
  | { type: 'report_submit',         target_type: 'combo' | 'review', target_id: string };
```

## session_id 생성 규칙

- 클라이언트 cookie `mzr_sid`에 UUID v4
- 만료 30일, `SameSite=Lax`, `Secure`(production), `HttpOnly` 아님(클라이언트 JS에서 갱신 필요)
- 새 디바이스/시크릿창 = 새 ID
- 로그인해도 session_id는 유지 (user_id가 별도 칼럼)

## RLS 정책

- INSERT: anon + authenticated 모두 허용 (페이지뷰는 비회원도 기록)
- SELECT: admin only (`auth.jwt()->>'is_admin' = 'true'`)
- UPDATE/DELETE: 차단 (감사 무결성)

## KPI 집계 SQL 예시

```sql
-- 상세 진입률 (전체 퍼널, 최근 14일)
with sessions as (
  select session_id,
         count(*) filter (where type = 'list_view')   as list_count,
         count(*) filter (where type = 'detail_view') as detail_count
  from events
  where created_at >= now() - interval '14 days'
  group by session_id
)
select
  count(*) filter (where list_count > 0)                                    as list_sessions,
  count(*) filter (where list_count > 0 and detail_count > 0)               as detail_sessions,
  round(100.0 * count(*) filter (where list_count > 0 and detail_count > 0)
                / nullif(count(*) filter (where list_count > 0), 0), 2)      as detail_rate_pct
from sessions;

-- 따봉 클릭률 (로그인 사용자, 최근 14일)
select
  round(100.0 * count(*) filter (where type = 'vote_click')
                / nullif(count(distinct session_id) filter (where type = 'detail_view' and user_id is not null), 0), 2) as vote_rate_pct
from events
where created_at >= now() - interval '14 days'
  and user_id is not null;
```

## 새 이벤트 추가 절차

1. `events_type` enum에 ALTER TYPE으로 값 추가 (마이그레이션)
2. 본 문서에 매핑 추가
3. `apps/web/lib/analytics/events.ts` 헬퍼 함수 추가
4. 호출 위치 추가 + payload 타입 갱신
