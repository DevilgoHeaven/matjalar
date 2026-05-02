/**
 * combo-signature.ts 단위 테스트
 *
 * 검증 범위:
 *  - 동일 입력은 항상 동일한 해시를 반환한다
 *  - 옵션 순서가 달라도 동일한 해시를 반환한다 (sort 안정성)
 *  - NFC 정규화: NFD 입력과 NFC 입력이 동일한 해시를 반환한다
 *  - 다른 입력은 다른 해시를 반환한다
 *  - 반환값은 64자 소문자 hex 문자열이다
 */

import { describe, it, expect } from 'vitest';
import { buildComboSignature } from './combo-signature';
import type { SignatureOption } from './combo-signature';

// ─────────────────────────────────────────────
// 테스트 픽스처
// ─────────────────────────────────────────────

const BRAND_ID = 'brand-uuid-subway';
const VARIANT_ID = 'variant-uuid-bmt-15cm';

const OPTION_A: SignatureOption = {
  actionType: 'select',
  optionGroupId: 'group-bread',
  optionItemId: 'item-wheat',
};

const OPTION_B: SignatureOption = {
  actionType: 'select',
  optionGroupId: 'group-sauce',
  optionItemId: 'item-ranch',
};

const OPTION_C: SignatureOption = {
  actionType: 'add',
  optionGroupId: 'group-sauce',
  optionItemId: 'item-chili',
};

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('buildComboSignature', () => {
  it('동일한 입력은 항상 동일한 해시를 반환한다 (결정론적)', async () => {
    const input = {
      brandId: BRAND_ID,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A, OPTION_B],
    };

    const first = await buildComboSignature(input);
    const second = await buildComboSignature(input);

    expect(first).toBe(second);
  });

  it('옵션 목록의 순서가 달라도 동일한 해시를 반환한다 (sort 안정성)', async () => {
    const inputAB = await buildComboSignature({
      brandId: BRAND_ID,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A, OPTION_B],
    });

    // B → A 순서로 전달
    const inputBA = await buildComboSignature({
      brandId: BRAND_ID,
      menuVariantId: VARIANT_ID,
      options: [OPTION_B, OPTION_A],
    });

    expect(inputAB).toBe(inputBA);
  });

  it('NFD 정규화 문자열과 NFC 정규화 문자열이 동일한 해시를 반환한다', async () => {
    // 한국어 "테" 는 NFD ('퉁') 와 NFC ('테') 두 표현이 있음
    // 내부적으로 NFC 정규화를 수행하므로 두 입력의 결과가 같아야 한다
    const nfcBrandId = '브랜드'.normalize('NFC');
    const nfdBrandId = '브랜드'.normalize('NFD');

    const hashNfc = await buildComboSignature({
      brandId: nfcBrandId,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A],
    });

    const hashNfd = await buildComboSignature({
      brandId: nfdBrandId,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A],
    });

    expect(hashNfc).toBe(hashNfd);
  });

  it('브랜드 ID가 다르면 다른 해시를 반환한다', async () => {
    const hash1 = await buildComboSignature({
      brandId: 'brand-A',
      menuVariantId: VARIANT_ID,
      options: [OPTION_A],
    });

    const hash2 = await buildComboSignature({
      brandId: 'brand-B',
      menuVariantId: VARIANT_ID,
      options: [OPTION_A],
    });

    expect(hash1).not.toBe(hash2);
  });

  it('옵션 항목이 다르면 다른 해시를 반환한다', async () => {
    const hashAB = await buildComboSignature({
      brandId: BRAND_ID,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A, OPTION_B],
    });

    // OPTION_C는 OPTION_B와 다른 actionType
    const hashAC = await buildComboSignature({
      brandId: BRAND_ID,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A, OPTION_C],
    });

    expect(hashAB).not.toBe(hashAC);
  });

  it('반환값은 64자 소문자 16진수 문자열이다 (SHA-256 형식 검증)', async () => {
    const hash = await buildComboSignature({
      brandId: BRAND_ID,
      menuVariantId: VARIANT_ID,
      options: [OPTION_A, OPTION_B, OPTION_C],
    });

    // SHA-256 hex: 정확히 64자, 소문자 hex 문자만 포함
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
