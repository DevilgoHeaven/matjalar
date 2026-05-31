import 'server-only';

import { loadPublishedCombos, type PublicCombo } from '@/lib/combo/public-combos';

export type RankingKind =
  | 'hot'
  | 'budget'
  | 'beginner'
  | 'diet'
  | 'spicy'
  | 'hearty';

export const RANKING_DEFINITIONS: Record<
  RankingKind,
  { label: string; title: string; description: string; tagSlug?: string }
> = {
  hot: {
    label: '실시간 인기',
    title: '오늘 바로 고르는 인기 조합',
    description: '따봉, 찜, 후기 반응이 먼저 쌓인 조합부터 보여줘요.',
  },
  budget: {
    label: '만원컷',
    title: '만원 안쪽으로 끝내는 조합',
    description: '가격 확인중 항목은 빼고, 낮은 예상가와 반응을 같이 봅니다.',
  },
  beginner: {
    label: '초보추천',
    title: '처음 주문해도 덜 헤매는 조합',
    description: '옵션 선택이 과하지 않고 실패 확률이 낮은 조합이에요.',
    tagSlug: 'beginner',
  },
  diet: {
    label: '다이어트',
    title: '가볍게 먹는 조합',
    description: '소스와 추가 토핑 부담을 줄인 산뜻한 선택지예요.',
    tagSlug: 'diet',
  },
  spicy: {
    label: '매운맛',
    title: '매운맛이 분명한 조합',
    description: '할라피뇨, 핫칠리, 치폴레 계열을 좋아할 때 고르기 쉬워요.',
    tagSlug: 'spicy',
  },
  hearty: {
    label: '든든한 점심',
    title: '한 끼 버티는 든든한 조합',
    description: '30cm, 세트, 추가 토핑처럼 포만감이 강한 조합이에요.',
    tagSlug: 'hearty',
  },
};

export interface RankingPageData {
  kind: RankingKind;
  definition: (typeof RANKING_DEFINITIONS)[RankingKind];
  combos: PublicCombo[];
}

export async function getRankingPageData(kindParam: string | null): Promise<RankingPageData> {
  const kind = parseRankingKind(kindParam);
  const definition = RANKING_DEFINITIONS[kind];
  const combos = await loadPublishedCombos();

  return {
    kind,
    definition,
    combos: rankCombos(combos, kind).slice(0, 24),
  };
}

export function parseRankingKind(value: string | null | undefined): RankingKind {
  if (isRankingKind(value)) {
    return value;
  }
  return 'hot';
}

export function isRankingKind(value: string | null | undefined): value is RankingKind {
  return (
    value === 'budget' ||
    value === 'beginner' ||
    value === 'diet' ||
    value === 'spicy' ||
    value === 'hearty' ||
    value === 'hot'
  );
}

function rankCombos(combos: PublicCombo[], kind: RankingKind) {
  if (kind === 'budget') {
    return combos
      .filter((combo) => combo.priceStatus !== 'unknown' && combo.estimatedPrice <= 10000)
      .sort(
        (a, b) =>
          a.estimatedPrice - b.estimatedPrice ||
          b.stats.hotScore - a.stats.hotScore ||
          b.stats.voteCount - a.stats.voteCount
      );
  }

  const tagSlug = RANKING_DEFINITIONS[kind].tagSlug;
  return combos
    .filter((combo) => !tagSlug || combo.tagSlugs.includes(tagSlug))
    .sort(
      (a, b) =>
        b.stats.hotScore - a.stats.hotScore ||
        b.stats.voteCount - a.stats.voteCount ||
        b.bookmarkCount - a.bookmarkCount
    );
}
