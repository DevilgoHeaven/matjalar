/**
 * @mzr/db — 패키지 진입점
 *
 * 외부에 노출할 모듈:
 *  - Database 타입 (supabase gen types 산출물)
 *  - 순수 도메인 로직 (combo summary/price/signature)
 */

// Database 타입 (M1 에서 supabase gen 으로 자동 생성)
export type { Database } from './types/database';

// 조합 카드 한 줄 요약 생성
export { buildCardSummary } from './lib/combo-summary';
export type { ComboOption } from './lib/combo-summary';

// 조합 예상 가격 계산
export { calculateEstimatedPrice } from './lib/combo-price';
export type { PriceOption } from './lib/combo-price';

// 조합 고유 서명(SHA-256 hex) 생성
export { buildComboSignature } from './lib/combo-signature';
export type { SignatureOption } from './lib/combo-signature';

// 관리자 성장 분석 집계
export { computeAdminAnalytics } from './lib/admin-analytics';
export type {
  AdminAnalyticsBucket,
  AdminAnalyticsClientError,
  AdminAnalyticsComboMetric,
  AdminAnalyticsEvent,
  AdminAnalyticsSummary,
  AdminAnalyticsWindow,
} from './lib/admin-analytics';

// v1.6 콘텐츠 확장 후보 seed backlog
export {
  V16_CONTENT_SOURCE_URLS,
  V16_GROWTH_COMBO_SEEDS,
  summarizeGrowthComboSeeds,
} from './lib/content-expansion-seeds';
export type {
  GrowthComboSeed,
  GrowthComboSeedSummary,
  GrowthSeedBrand,
  GrowthSeedCategory,
} from './lib/content-expansion-seeds';
