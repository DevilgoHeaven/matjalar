import { describe, expect, it } from 'vitest';
import { buildComboPersonality } from './combo-personality';

describe('buildComboPersonality', () => {
  it('prioritizes spicy signals over generic budget signals', () => {
    expect(
      buildComboPersonality({
        title: '핫칠리 BMT',
        cardSummary: 'BMT 15cm · 할라피뇨 · 핫칠리',
        estimatedPrice: 6200,
        priceStatus: 'approx',
        tagLabels: ['가성비'],
      }).mood
    ).toBe('spicy');
  });

  it('marks low-price combos as budget when no stronger signal exists', () => {
    const profile = buildComboPersonality({
      title: '햄 기본',
      cardSummary: '햄 15cm · 위트 · 머스타드',
      estimatedPrice: 5500,
      priceStatus: 'approx',
    });

    expect(profile.mood).toBe('budget');
    expect(profile.badgeLabel).toBe('만원 안쪽');
  });

  it('keeps beginner classics distinct from generic classic cards', () => {
    const profile = buildComboPersonality({
      title: '실패없는 BMT 정석',
      cardSummary: 'BMT 15cm · 위트 · 사우스웨스트',
      estimatedPrice: 6900,
      priceStatus: 'approx',
    });

    expect(profile.mood).toBe('safe');
    expect(profile.situation).toContain('처음');
  });
});
