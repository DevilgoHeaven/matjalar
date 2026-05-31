/**
 * 타이포그래피 토큰
 *
 * 한국어 본문에 최적화된 폰트 스택과 굵기 값을 정의한다.
 * Pretendard Variable 가 로드되지 않을 경우 시스템 폰트로 자동 폴백.
 */

/**
 * 한국어 본문 우선 폰트 스택.
 * CSS `font-family` 값으로 직접 사용 가능.
 */
export const FONT_STACK_KO =
  'Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

/**
 * 폰트 굵기 토큰.
 * Tailwind `font-{weight}` 클래스와 병행 사용 가능.
 */
export const FONT_WEIGHTS = {
  /** 본문 기본 굵기 */
  regular: 400,
  /** 라벨·부제목 강조 굵기 */
  semibold: 600,
  /** 헤딩·핵심 강조 굵기 */
  bold: 700,
} as const;

export type FontWeightKey = keyof typeof FONT_WEIGHTS;
