/**
 * combo-price.ts 단위 테스트
 *
 * 검증 범위:
 *  - happy path: 기본가만 있는 경우
 *  - 세트 옵션(isSetOption=true) 가격 합산
 *  - add 액션 옵션 가격 합산
 *  - 음수 합산 결과 → 0 클램프
 *  - NaN 기본가 방어 처리
 *  - NaN delta 방어 처리
 */

import { describe, it, expect } from 'vitest';
import { calculateEstimatedPrice } from './combo-price';
import type { PriceOption } from './combo-price';

describe('calculateEstimatedPrice', () => {
  it('happy path: 옵션이 없으면 기본가 그대로 반환한다', () => {
    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 6900,
      options: [],
    });

    expect(result).toBe(6900);
  });

  it('세트 옵션(isSetOption=true)은 actionType 관계없이 가격에 합산한다', () => {
    // 예: 세트 업그레이드 +2500
    const options: PriceOption[] = [
      { actionType: 'select', priceDelta: 2500, isSetOption: true },
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 5500,
      options,
    });

    expect(result).toBe(8000);
  });

  it('add 액션 옵션의 delta를 모두 합산한다', () => {
    const options: PriceOption[] = [
      { actionType: 'add', priceDelta: 500 },   // 샷 추가
      { actionType: 'add', priceDelta: 700 },   // 시럽 추가
      { actionType: 'select', priceDelta: 0 },  // 기본 선택 (합산 안 됨)
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 5800,
      options,
    });

    expect(result).toBe(7000);
  });

  it('세트 옵션과 add 옵션이 함께 있을 때 모두 합산한다', () => {
    const options: PriceOption[] = [
      { actionType: 'select', priceDelta: 2500, isSetOption: true }, // 세트 +2500
      { actionType: 'add', priceDelta: 500 },                         // 샷 추가 +500
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 4900,
      options,
    });

    expect(result).toBe(7900);
  });

  it('합산 결과가 음수이면 0으로 클램프한다', () => {
    // 극단적인 음수 delta가 들어와도 0 미만이 되지 않아야 함
    const options: PriceOption[] = [
      { actionType: 'add', priceDelta: -99999 },
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 1000,
      options,
    });

    expect(result).toBe(0);
  });

  it('기본가가 NaN이면 0으로 처리하고 옵션 delta만 합산한다', () => {
    const options: PriceOption[] = [
      { actionType: 'add', priceDelta: 500 },
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: NaN,
      options,
    });

    expect(result).toBe(500);
  });

  it('옵션 delta가 NaN이면 해당 항목을 0으로 처리한다', () => {
    const options: PriceOption[] = [
      { actionType: 'add', priceDelta: NaN },   // 무효 delta → 0 처리
      { actionType: 'add', priceDelta: 300 },   // 유효 delta
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 4000,
      options,
    });

    expect(result).toBe(4300);
  });

  it('소수점 결과는 Math.round로 KRW 정수로 반환한다', () => {
    // 실제로는 소수점 delta가 들어오면 안 되지만 방어적으로 처리
    const options: PriceOption[] = [
      { actionType: 'add', priceDelta: 0.6 },
    ];

    const result = calculateEstimatedPrice({
      menuVariantBasePrice: 1000,
      options,
    });

    // 1000 + 0.6 = 1000.6 → Math.round → 1001
    expect(result).toBe(1001);
  });
});
