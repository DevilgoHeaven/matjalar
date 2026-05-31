import { describe, expect, it } from 'vitest';
import {
  V16_CONTENT_SOURCE_URLS,
  V16_GROWTH_COMBO_SEEDS,
  summarizeGrowthComboSeeds,
} from './content-expansion-seeds';

describe('v1.6 growth combo seed backlog', () => {
  it('keeps the planned minimum coverage for CVS and burger categories', () => {
    const cvs = V16_GROWTH_COMBO_SEEDS.filter((seed) => seed.category === 'cvs');
    const burger = V16_GROWTH_COMBO_SEEDS.filter(
      (seed) => seed.category === 'burger'
    );

    expect(cvs).toHaveLength(20);
    expect(burger).toHaveLength(20);
    expect(new Set(cvs.map((seed) => seed.brandSlug))).toEqual(new Set(['gs25', 'cu']));
    expect(new Set(burger.map((seed) => seed.brandSlug))).toEqual(
      new Set(['mcdonalds', 'burgerking'])
    );
  });

  it('does not mark externally gathered seed prices as exact', () => {
    expect(V16_GROWTH_COMBO_SEEDS.every((seed) => seed.priceStatus === 'approx')).toBe(
      true
    );
    expect(
      V16_GROWTH_COMBO_SEEDS.every((seed) => seed.confidence === 'unverified')
    ).toBe(true);
  });

  it('summarizes the operator review backlog by category and brand', () => {
    expect(summarizeGrowthComboSeeds()).toEqual({
      total: 40,
      byCategory: [
        { category: 'cvs', count: 20 },
        { category: 'burger', count: 20 },
      ],
      byBrand: [
        { brandSlug: 'gs25', count: 10 },
        { brandSlug: 'cu', count: 10 },
        { brandSlug: 'mcdonalds', count: 10 },
        { brandSlug: 'burgerking', count: 10 },
      ],
      sourceUrls: V16_CONTENT_SOURCE_URLS,
    });
  });
});
