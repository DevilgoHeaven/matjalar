/**
 * 메인 액션·피드백 컬러 팔레트 (PRD §12)
 * 카테고리 컬러는 categories.ts 참조.
 */

export const COLORS = {
  action: '#111111',       // 메인 검정 — 버튼/제출
  bookmark: '#FF3D6E',     // 찜 하트 핑크
  exclude: '#E53935',      // 옵션 빼기 표기 (R-14 ReceiptBox)
  bg: '#FAFAFA',
  text: '#111111',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  warning: '#F59E0B',
  success: '#10B981',
} as const;

export type ColorKey = keyof typeof COLORS;
