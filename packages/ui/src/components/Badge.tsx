/**
 * Badge — v1 카테고리 그리드의 '준비중' 배지·기본 chip 으로 사용.
 *
 * tone 별 의미:
 *  - 'default'  : 기본 검정 텍스트 / 연회색 배경
 *  - 'muted'    : 준비중 배지용 — 더 연한 회색 계열
 *  - 'category' : categoryColor 파스텔 배경 (동적 style prop 허용)
 */
import type { ReactNode } from 'react';

export type BadgeTone = 'default' | 'muted' | 'category';

export interface BadgeProps {
  children: ReactNode;
  /** 배지 색조 변형 */
  tone?: BadgeTone;
  /**
   * tone='category' 일 때 사용할 파스텔 배경색 (hex).
   * 예: '#FFE5D9'
   */
  categoryColor?: string;
}

/** tone → Tailwind 정적 클래스 매핑 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  default: 'bg-gray-100 text-gray-800',
  muted:   'bg-gray-100 text-gray-400',
  category: 'text-gray-700',
};

/**
 * Badge 컴포넌트 (Server Component 호환 — 'use client' 불필요).
 */
export function Badge({ children, tone = 'default', categoryColor }: BadgeProps) {
  /* tone='category' 인 경우에만 동적 배경색을 style prop 으로 적용 */
  const dynamicStyle =
    tone === 'category' && categoryColor ? { backgroundColor: categoryColor } : undefined;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
      style={dynamicStyle}
    >
      {children}
    </span>
  );
}
