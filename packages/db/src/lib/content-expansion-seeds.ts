export type GrowthSeedCategory = 'cvs' | 'burger';
export type GrowthSeedBrand =
  | 'gs25'
  | 'cu'
  | 'mcdonalds'
  | 'burgerking';

export interface GrowthComboSeed {
  category: GrowthSeedCategory;
  brandSlug: GrowthSeedBrand;
  title: string;
  cardSummary: string;
  tags: string[];
  priceStatus: 'approx';
  confidence: 'unverified';
  sourceKinds: Array<'official' | 'community' | 'news'>;
}

export interface GrowthComboSeedSummary {
  total: number;
  byCategory: Array<{ category: GrowthSeedCategory; count: number }>;
  byBrand: Array<{ brandSlug: GrowthSeedBrand; count: number }>;
  sourceUrls: readonly string[];
}

export const V16_CONTENT_SOURCE_URLS = [
  'https://www.mcdonalds.co.kr/kor/menu/mc-cafe',
  'https://web-prd.burgerking.co.kr/menu/main',
  'https://cu.bgfretail.com/product/product.do',
  'https://gs25.gsretail.com/gscvs/ko/store-services/new-concept',
  'https://www.trendmonitor.co.kr/Data/CKOREA/3237/20250507070740_20250422%202025%20%ED%8E%B8%EC%9D%98%EC%A0%90%20%EC%9D%B4%EC%9A%A9%20%EB%B0%8F%20%EC%BD%9C%EB%9D%BC%EB%B3%B4%20%EC%A0%9C%ED%92%88%20%EA%B4%80%EB%A0%A8%20U%26A%20%EC%A1%B0%EC%82%AC_%EB%AF%B8%EB%A6%AC%EB%B3%B4%EA%B8%B0.pdf',
  'https://www.reddit.com/r/unravelkorea/comments/1rouvve/korean_convenience_stores_are_genuinely_underrated/',
] as const;

export const V16_GROWTH_COMBO_SEEDS: GrowthComboSeed[] = [
  seed('cvs', 'gs25', '오모리 김치라면 김밥 세트', '오모리 김치라면 · 참치마요김밥 · 매장 조리', ['cheap', 'hearty', 'spicy']),
  seed('cvs', 'gs25', '점보도시락 나눔 조합', '점보도시락 · 삼각김밥 · 2인 나눔', ['popular', 'hearty']),
  seed('cvs', 'gs25', '도시락 컵라면 점심', '한식도시락 · 컵라면 · 점심', ['hearty', 'lunch']),
  seed('cvs', 'gs25', '샌드위치 커피 출근', '샌드위치 · CAFE25 · 출근길', ['breakfast', 'beginner']),
  seed('cvs', 'gs25', '치킨마요 컵밥 라이트', '치킨마요컵밥 · 생수 · 간단식', ['cheap', 'beginner']),
  seed('cvs', 'gs25', '삼각김밥 컵누들 컷', '삼각김밥 · 컵누들 · 야식', ['cheap', 'diet']),
  seed('cvs', 'gs25', '핫바 김밥 야식', '김밥 · 핫바 · 야식', ['hearty', 'night']),
  seed('cvs', 'gs25', '냉장 파스타 탄산', '냉장파스타 · 제로탄산 · 전자레인지', ['beginner']),
  seed('cvs', 'gs25', '브레디크 우유 디저트', '브레디크 · 흰우유 · 디저트', ['dessert']),
  seed('cvs', 'gs25', '샐러드 닭가슴살 컷', '샐러드 · 닭가슴살 · 가볍게', ['diet']),
  seed('cvs', 'cu', '백종원 도시락 라면', '백종원도시락 · 컵라면 · 점심', ['hearty', 'popular']),
  seed('cvs', 'cu', '연세우유빵 커피', '연세우유빵 · GET커피 · 디저트', ['dessert', 'popular']),
  seed('cvs', 'cu', '슈퍼라지킹 삼각김밥', '라지킹삼각김밥 · 탄산 · 나눔', ['hearty', 'popular']),
  seed('cvs', 'cu', '김밥 컵라면 기본', '김밥 · 컵라면 · 매장 조리', ['cheap', 'beginner']),
  seed('cvs', 'cu', '간편식 샌드위치 아침', '샌드위치 · 컵커피 · 아침', ['breakfast']),
  seed('cvs', 'cu', '닭가슴살 샐러드', '샐러드 · 닭가슴살 · 식단', ['diet']),
  seed('cvs', 'cu', '떡볶이 김밥 야식', '떡볶이 · 김밥 · 야식', ['spicy', 'night']),
  seed('cvs', 'cu', '핫바 삼각김밥', '삼각김밥 · 핫바 · 빠른 한 끼', ['cheap', 'hearty']),
  seed('cvs', 'cu', '디저트 우유 조합', '디저트빵 · 우유 · 당충전', ['dessert']),
  seed('cvs', 'cu', '냉장면 제로음료', '냉장면 · 제로음료 · 점심', ['lunch']),
  seed('burger', 'mcdonalds', '빅맥 제로 세트', '빅맥 세트 · 후렌치후라이 · 제로콜라', ['beginner', 'hearty']),
  seed('burger', 'mcdonalds', '상하이 치킨 매콤 세트', '맥스파이시 상하이 세트 · 후렌치후라이 · 제로콜라', ['spicy', 'popular']),
  seed('burger', 'mcdonalds', '불고기버거 가성비', '불고기버거 세트 · 후렌치후라이 · 앱쿠폰', ['cheap', 'beginner']),
  seed('burger', 'mcdonalds', '더블치즈 단백질', '더블치즈버거 세트 · 코울슬로 · 제로콜라', ['hearty']),
  seed('burger', 'mcdonalds', '맥모닝 출근 컷', '맥모닝 세트 · 해시브라운 · 커피', ['breakfast']),
  seed('burger', 'mcdonalds', '스낵랩 사이드 조합', '스낵랩 · 감자튀김 · 아이스티', ['cheap']),
  seed('burger', 'mcdonalds', '1955 든든 세트', '1955버거 세트 · 후렌치후라이 · 제로콜라', ['hearty']),
  seed('burger', 'mcdonalds', '슈비버거 새우 컷', '슈비버거 세트 · 후렌치후라이 · 탄산', ['popular']),
  seed('burger', 'mcdonalds', '치즈버거 더블업', '치즈버거 · 사이드샐러드 · 커피', ['cheap']),
  seed('burger', 'mcdonalds', '맥카페 디저트', '맥카페 · 애플파이 · 오후 간식', ['dessert']),
  seed('burger', 'burgerking', '와퍼 앱쿠폰 정석', '와퍼 세트 · 프렌치프라이 · 앱쿠폰', ['beginner', 'popular']),
  seed('burger', 'burgerking', '통새우와퍼 매콤', '통새우와퍼 세트 · 프렌치프라이 · 제로콜라', ['spicy', 'popular']),
  seed('burger', 'burgerking', '콰트로치즈 묵직', '콰트로치즈와퍼 세트 · 치즈스틱 · 탄산', ['hearty']),
  seed('burger', 'burgerking', '불고기와퍼 입문', '불고기와퍼 세트 · 프렌치프라이 · 앱쿠폰', ['beginner']),
  seed('burger', 'burgerking', '롱치킨 가성비', '롱치킨버거 세트 · 프렌치프라이 · 제로콜라', ['cheap']),
  seed('burger', 'burgerking', '치킨킹 매운맛', '치킨킹 세트 · 프렌치프라이 · 탄산', ['spicy']),
  seed('burger', 'burgerking', '너겟 사이드 강화', '와퍼주니어 · 너겟 · 제로콜라', ['cheap']),
  seed('burger', 'burgerking', '아침 커피 대체', '불고기버거 · 아메리카노 · 빠른 식사', ['breakfast']),
  seed('burger', 'burgerking', '몬스터와퍼 든든', '몬스터와퍼 세트 · 프렌치프라이 · 탄산', ['hearty']),
  seed('burger', 'burgerking', '치즈와퍼 기본', '치즈와퍼 세트 · 프렌치프라이 · 앱쿠폰', ['beginner']),
];

export function summarizeGrowthComboSeeds(
  seeds: readonly GrowthComboSeed[] = V16_GROWTH_COMBO_SEEDS
): GrowthComboSeedSummary {
  return {
    total: seeds.length,
    byCategory: countSeedsByCategory(seeds),
    byBrand: countSeedsByBrand(seeds),
    sourceUrls: V16_CONTENT_SOURCE_URLS,
  };
}

function seed(
  category: GrowthSeedCategory,
  brandSlug: GrowthSeedBrand,
  title: string,
  cardSummary: string,
  tags: string[]
): GrowthComboSeed {
  return {
    category,
    brandSlug,
    title,
    cardSummary,
    tags,
    priceStatus: 'approx',
    confidence: 'unverified',
    sourceKinds: ['community', 'official', 'news'],
  };
}

function countSeedsByCategory(
  seeds: readonly GrowthComboSeed[]
): GrowthComboSeedSummary['byCategory'] {
  const counts = new Map<GrowthSeedCategory, number>();
  for (const seed of seeds) {
    counts.set(seed.category, (counts.get(seed.category) ?? 0) + 1);
  }

  return Array.from(counts, ([category, count]) => ({ category, count }));
}

function countSeedsByBrand(
  seeds: readonly GrowthComboSeed[]
): GrowthComboSeedSummary['byBrand'] {
  const counts = new Map<GrowthSeedBrand, number>();
  for (const seed of seeds) {
    counts.set(seed.brandSlug, (counts.get(seed.brandSlug) ?? 0) + 1);
  }

  return Array.from(counts, ([brandSlug, count]) => ({ brandSlug, count }));
}
