export type ComboMood =
  | 'safe'
  | 'budget'
  | 'light'
  | 'spicy'
  | 'hearty'
  | 'sweet'
  | 'classic';

export interface ComboPersonalityInput {
  title: string;
  cardSummary: string;
  estimatedPrice: number;
  priceStatus: string;
  tagLabels?: readonly string[];
  tagSlugs?: readonly string[];
}

export interface ComboPersonality {
  mood: ComboMood;
  visualKey: ComboMood;
  badgeLabel: string;
  situation: string;
  appetiteLine: string;
  reason: string;
  orderTip: string;
  shareText: string;
}

const MOOD_COPY: Record<ComboMood, Omit<ComboPersonality, 'mood' | 'visualKey'>> = {
  safe: {
    badgeLabel: '처음이면 이쪽',
    situation: '처음 주문해도 덜 헤매는 날',
    appetiteLine: '익숙한 재료에 소스 조합만 살짝 얹은 안정적인 한입.',
    reason: '옵션 선택이 과하지 않아 매장 앞에서 바로 말하기 좋습니다.',
    orderTip: '야채는 기본으로 두고, 소스 이름만 또렷하게 말하면 충분해요.',
    shareText: '처음 주문이면 이 조합으로 가도 무난해요.',
  },
  budget: {
    badgeLabel: '만원 안쪽',
    situation: '가격 먼저 보고 고르는 점심',
    appetiteLine: '가볍게 시작하지만 한 끼 느낌은 남기는 실속 조합.',
    reason: '가격 확인중 항목을 피하고 낮은 예상가를 우선한 선택입니다.',
    orderTip: '추가 토핑을 늘리기 전 예상가를 한 번만 확인하세요.',
    shareText: '오늘은 돈 덜 쓰고도 만족감 챙기는 쪽.',
  },
  light: {
    badgeLabel: '가볍게',
    situation: '부담 줄이고 싶은 날',
    appetiteLine: '야채와 담백한 재료가 먼저 느껴지는 산뜻한 조합.',
    reason: '소스와 추가 토핑 부담을 줄여 오후에도 무겁지 않습니다.',
    orderTip: '소스는 한 가지로 줄이거나 라이트 요청을 붙이면 더 깔끔해요.',
    shareText: '무겁지 않게 먹고 싶은 날엔 이 조합.',
  },
  spicy: {
    badgeLabel: '매운맛 확실',
    situation: '입맛이 밋밋한 날',
    appetiteLine: '매콤한 끝맛이 남아서 한 입마다 존재감이 있습니다.',
    reason: '할라피뇨나 칠리 계열이 들어가 매운맛 기대치를 맞추기 쉽습니다.',
    orderTip: '매운 소스가 겹치면 강해져요. 처음이면 하나만 고르세요.',
    shareText: '매운맛 당기는 날 친구한테 던지기 좋은 조합.',
  },
  hearty: {
    badgeLabel: '든든한 한 끼',
    situation: '점심 한 끼로 오래 버텨야 할 때',
    appetiteLine: '메인과 옵션이 묵직해서 식사감이 분명한 조합.',
    reason: '세트, 30cm, 고기 계열처럼 포만감이 남는 요소를 우선했습니다.',
    orderTip: '세트나 사이즈를 바꾸면 가격이 크게 달라질 수 있어요.',
    shareText: '배고픈 날엔 이 정도는 되어야 한 끼 같아요.',
  },
  sweet: {
    badgeLabel: '달콤짭짤',
    situation: '자극은 줄이고 맛은 챙기고 싶은 날',
    appetiteLine: '달콤한 소스와 짭짤한 재료가 부드럽게 이어집니다.',
    reason: '강한 매운맛 없이도 맛의 방향이 분명해 실패 확률이 낮습니다.',
    orderTip: '단맛 소스가 들어가면 마요 계열은 적게 잡는 편이 좋아요.',
    shareText: '달콤짭짤한 쪽 좋아하면 이 조합.',
  },
  classic: {
    badgeLabel: '기본 탄탄',
    situation: '고민을 빨리 끝내고 싶은 날',
    appetiteLine: '브랜드 기본 맛을 크게 벗어나지 않는 균형 잡힌 조합.',
    reason: '메뉴와 옵션 흐름이 단순해서 빠르게 고르기 좋습니다.',
    orderTip: '메뉴와 사이즈를 먼저 말하고, 옵션은 화면 순서대로 읽으면 됩니다.',
    shareText: '오늘 메뉴 고민 끝내는 기본 조합.',
  },
};

export function buildComboPersonality(
  input: ComboPersonalityInput
): ComboPersonality {
  const mood = detectMood(input);
  return {
    mood,
    visualKey: mood,
    ...MOOD_COPY[mood],
  };
}

function detectMood(input: ComboPersonalityInput): ComboMood {
  const text = [
    input.title,
    input.cardSummary,
    ...(input.tagLabels ?? []),
    ...(input.tagSlugs ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (hasAny(text, ['매운', '매콤', '핫', '칠리', '할라피뇨', '스파이시', 'spicy'])) {
    return 'spicy';
  }
  if (hasAny(text, ['다이어트', '라이트', '베지', '샐러드', '야채', 'diet'])) {
    return 'light';
  }
  if (hasAny(text, ['든든', '30cm', '세트', '스테이크', '미트볼', 'hearty'])) {
    return 'hearty';
  }
  if (
    hasAny(text, ['가성비', '만원', '학생', 'cheap', 'budget']) ||
    (input.priceStatus !== 'unknown' && input.estimatedPrice <= 6500)
  ) {
    return 'budget';
  }
  if (hasAny(text, ['초보', '실패', '정석', '기본', '입문', '처음', 'beginner'])) {
    return 'safe';
  }
  if (hasAny(text, ['달콤', '데리야끼', '허니', '스위트', 'sweet'])) {
    return 'sweet';
  }
  return 'classic';
}

function hasAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
