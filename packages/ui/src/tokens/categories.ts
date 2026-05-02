/**
 * 카테고리 디자인 토큰 (7개)
 *
 * PRD §12 기준: 카테고리별 파스텔 컬러 + 이모지로 시각 구분
 * v1 은 이미지 없음 (R-14) — 텍스트/이모지/브랜드 컬러로 차별화
 *
 * 카테고리 키 ↔ launch_status (DB) 매핑:
 *  - fastfood: 패스트푸드 (active — 서브웨이로 v1 출시)
 *  - 나머지 6개: planned (준비중 배지)
 */

export type CategoryKey =
  | 'fastfood'
  | 'cafedessert'
  | 'chicken'
  | 'pizza'
  | 'bunsik'
  | 'buffet'
  | 'cvs';

export type CategoryToken = {
  /** DB enum 키 (영문, snake_case 호환) */
  key: CategoryKey;
  /** 사용자 노출 라벨 (한글) */
  label: string;
  /** 카테고리 식별 이모지 */
  emoji: string;
  /** 파스텔 배경색 (hex) */
  color: string;
  /** v1 활성 여부 — false 면 "준비중" 배지 표시 */
  active: boolean;
};

/**
 * 카테고리 토큰 정의
 *
 * 컬러는 부드러운 파스텔로 통일 — 카드 배경에 깔리되 텍스트 가독성 유지.
 * 새 카테고리 추가 시 본 객체 + DB enum 동시 갱신 필수.
 */
export const CATEGORY_TOKENS: Readonly<Record<CategoryKey, CategoryToken>> = {
  fastfood: {
    key: 'fastfood',
    label: '패스트푸드',
    emoji: '🍔',
    color: '#FFE5D9',
    active: true,
  },
  cafedessert: {
    key: 'cafedessert',
    label: '카페·디저트',
    emoji: '☕',
    color: '#F4E4FF',
    active: false,
  },
  chicken: {
    key: 'chicken',
    label: '치킨',
    emoji: '🍗',
    color: '#FFF1B8',
    active: false,
  },
  pizza: {
    key: 'pizza',
    label: '피자',
    emoji: '🍕',
    color: '#FFD6CC',
    active: false,
  },
  bunsik: {
    key: 'bunsik',
    label: '분식',
    emoji: '🍜',
    color: '#FFE0E0',
    active: false,
  },
  buffet: {
    key: 'buffet',
    label: '뷔페',
    emoji: '🍽️',
    color: '#E0F4E0',
    active: false,
  },
  cvs: {
    key: 'cvs',
    label: '편의점',
    emoji: '🏪',
    color: '#D9F0FF',
    active: false,
  },
} as const;

/**
 * 모든 카테고리 토큰을 배열로 (정렬: active 먼저, 그 다음 정의 순서)
 */
export const CATEGORY_LIST: readonly CategoryToken[] = (
  Object.values(CATEGORY_TOKENS) as CategoryToken[]
).sort((a, b) => Number(b.active) - Number(a.active));
