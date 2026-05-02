import { z } from 'zod';

/**
 * 한국어 텍스트 schema 빌더 (R-06 NFC 정규화 강제)
 * - 닉네임·조합명·후기 등 모든 한국어 입력에 사용
 * - decomposed Hangul (NFD) 입력 시 자동으로 precomposed (NFC) 로 변환
 */
export const koreanText = (max = 140) =>
  z
    .string()
    .min(1, '내용을 입력해 주세요')
    .max(max, `${max}자 이내로 입력해 주세요`)
    .transform((s) => s.normalize('NFC'));

/** 평점 1~5 (0.1 단위) */
export const ratingSchema = z
  .number()
  .min(1, '최소 1점')
  .max(5, '최대 5점')
  .multipleOf(0.1);
