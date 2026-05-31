export type QuizPreference = 'budget' | 'beginner' | 'diet' | 'spicy' | 'hearty';

export const QUIZ_PREFERENCES: {
  id: QuizPreference;
  label: string;
  description: string;
  tagSlug?: string;
}[] = [
  {
    id: 'budget',
    label: '가격 먼저',
    description: '만원 안쪽이면 더 좋아요.',
    tagSlug: 'cheap',
  },
  {
    id: 'beginner',
    label: '실패 방지',
    description: '처음 주문해도 안전한 쪽.',
    tagSlug: 'beginner',
  },
  {
    id: 'diet',
    label: '가볍게',
    description: '소스와 토핑 부담을 줄이고 싶어요.',
    tagSlug: 'diet',
  },
  {
    id: 'spicy',
    label: '매운맛',
    description: '끝맛이 확실한 조합이 좋아요.',
    tagSlug: 'spicy',
  },
  {
    id: 'hearty',
    label: '든든함',
    description: '점심 한 끼로 오래 버티고 싶어요.',
    tagSlug: 'hearty',
  },
];

export function parseQuizPreferences(
  value: string | null | undefined
): QuizPreference[] {
  if (!value) return [];
  const known = new Set(QUIZ_PREFERENCES.map((item) => item.id));
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is QuizPreference => known.has(item as QuizPreference));
}
