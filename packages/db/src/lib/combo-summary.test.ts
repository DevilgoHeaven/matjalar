/**
 * combo-summary.ts 단위 테스트
 *
 * 검증 범위:
 *  - 브랜드별 4가지 happy path (subway / gongcha / starbucks / cvs)
 *  - "외 N" 표기 — 같은 그룹에 옵션이 2개 이상일 때
 *  - exclude 액션 타입은 카드 요약에 반영되지 않음
 */

import { describe, it, expect } from 'vitest';
import { buildCardSummary } from './combo-summary';
import type { ComboOption } from './combo-summary';

// ─────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────

/** select 옵션 단축 생성 헬퍼 */
function sel(groupName: string, itemName: string, sortOrder = 0): ComboOption {
  return { actionType: 'select', groupName, itemName, sortOrder };
}

/** add 옵션 단축 생성 헬퍼 */
function add(groupName: string, itemName: string, sortOrder = 0): ComboOption {
  return { actionType: 'add', groupName, itemName, sortOrder };
}

/** exclude 옵션 단축 생성 헬퍼 */
function exc(groupName: string, itemName: string, sortOrder = 0): ComboOption {
  return { actionType: 'exclude', groupName, itemName, sortOrder };
}

// ─────────────────────────────────────────────
// 서브웨이 테스트
// ─────────────────────────────────────────────

describe('buildCardSummary — 서브웨이', () => {
  it('happy path: 메뉴명·변형명·빵·소스 순으로 요약을 생성한다', () => {
    const options: ComboOption[] = [
      sel('빵 종류', '위트', 0),
      sel('소스', '랜치', 0),
    ];

    const result = buildCardSummary({
      brandSlug: 'subway',
      menuName: 'BMT',
      variantName: '15cm',
      options,
    });

    expect(result).toBe('BMT 15cm · 위트 · 랜치');
  });

  it('소스가 2개 이상이면 "소스명 외 N" 형태로 표기한다', () => {
    const options: ComboOption[] = [
      sel('빵 종류', '허니오트', 0),
      sel('소스', '랜치', 0),
      sel('소스', '스위트어니언', 1),
      sel('소스', '핫칠리', 2),
    ];

    const result = buildCardSummary({
      brandSlug: 'subway',
      menuName: '에그마요',
      variantName: '15cm',
      options,
    });

    // 소스 3개 → "랜치 외 2"
    expect(result).toBe('에그마요 15cm · 허니오트 · 랜치 외 2');
  });
});

// ─────────────────────────────────────────────
// 공차 테스트
// ─────────────────────────────────────────────

describe('buildCardSummary — 공차', () => {
  it('happy path: 메뉴명·당도·얼음·토핑 순으로 요약을 생성한다', () => {
    const options: ComboOption[] = [
      sel('당도', '반당', 0),
      sel('얼음', '소량', 0),
      sel('토핑', '타피오카 펄', 0),
    ];

    const result = buildCardSummary({
      brandSlug: 'gongcha',
      menuName: '밀크폼 블랙티',
      variantName: 'M',
      options,
    });

    expect(result).toBe('밀크폼 블랙티 · 반당 · 소량 · 타피오카 펄');
  });
});

// ─────────────────────────────────────────────
// 스타벅스 테스트
// ─────────────────────────────────────────────

describe('buildCardSummary — 스타벅스', () => {
  it('happy path: 메뉴명·샷·우유·휘핑 순으로 요약을 생성한다', () => {
    const options: ComboOption[] = [
      add('샷', '샷 추가', 0),
      sel('우유', '귀리', 0),
      sel('휘핑', '휘핑 없음', 0),
    ];

    const result = buildCardSummary({
      brandSlug: 'starbucks',
      menuName: '카라멜 마키아또',
      variantName: 'Tall',
      options,
    });

    expect(result).toBe('카라멜 마키아또 · 샷 추가 · 귀리 · 휘핑 없음');
  });
});

// ─────────────────────────────────────────────
// 편의점(CVS) 테스트
// ─────────────────────────────────────────────

describe('buildCardSummary — 편의점(CVS)', () => {
  it('happy path: 메뉴명·추가·조리 순으로 요약을 생성한다', () => {
    const options: ComboOption[] = [
      sel('추가', '참치마요', 0),
      sel('조리', '전자레인지', 0),
    ];

    const result = buildCardSummary({
      brandSlug: 'cvs',
      menuName: '삼각김밥',
      variantName: '',
      options,
    });

    expect(result).toBe('삼각김밥 · 참치마요 · 전자레인지');
  });
});

// ─────────────────────────────────────────────
// 엣지 케이스 테스트
// ─────────────────────────────────────────────

describe('buildCardSummary — 엣지 케이스', () => {
  it('토핑이 3개이면 "토핑명 외 2" 형태로 표기한다 (공차)', () => {
    const options: ComboOption[] = [
      sel('당도', '무당', 0),
      sel('얼음', '정량', 0),
      sel('토핑', '코코넛젤리', 0),
      sel('토핑', '알로에', 1),
      sel('토핑', '타피오카 펄', 2),
    ];

    const result = buildCardSummary({
      brandSlug: 'gongcha',
      menuName: '딸기 라떼',
      variantName: 'L',
      options,
    });

    // 토핑 3개 → sortOrder 0인 코코넛젤리가 대표, 외 2
    expect(result).toBe('딸기 라떼 · 무당 · 정량 · 코코넛젤리 외 2');
  });

  it('exclude 액션 옵션은 카드 요약 문자열에 나타나지 않는다 (서브웨이)', () => {
    const options: ComboOption[] = [
      sel('빵 종류', '화이트', 0),
      // 피클 제외 — exclude는 요약에 노출하지 않는 것이 PRD 의도
      exc('채소', '피클', 0),
      sel('소스', '머스타드', 0),
    ];

    const result = buildCardSummary({
      brandSlug: 'subway',
      menuName: '터키베이컨아보카도',
      variantName: '30cm',
      options,
    });

    // exclude 그룹('채소')은 템플릿에 포함되지 않으므로 결과에 없어야 함
    expect(result).not.toContain('피클');
    expect(result).toBe('터키베이컨아보카도 30cm · 화이트 · 머스타드');
  });
});
