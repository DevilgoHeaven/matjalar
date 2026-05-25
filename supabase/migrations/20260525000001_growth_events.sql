-- ===================================================================
-- 20260525000001_growth_events.sql
-- 공유/주문문/랭킹/퀴즈 성장 루프 이벤트
-- ===================================================================

alter type public.events_type add value if not exists 'order_copy';
alter type public.events_type add value if not exists 'share_click';
alter type public.events_type add value if not exists 'ranking_view';
alter type public.events_type add value if not exists 'quiz_result_share';
