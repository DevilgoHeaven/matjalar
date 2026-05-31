/**
 * Tailwind preset — 모든 앱·패키지가 상속하는 디자인 토큰
 *
 * - 카테고리 파스텔 컬러는 packages/ui/tokens/categories.ts 에서 가져옴
 * - 메인 액션 검정, 찜 핑크, exclude 빨강 (PRD §12)
 * - 한국어 본문 폰트 Pretendard
 */

import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // 메인 액션
        action: '#111111',
        // 찜 하트
        bookmark: '#FF3D6E',
        // exclude 옵션 (R-14)
        exclude: '#E53935',
        // 카테고리 파스텔 — packages/ui/tokens 와 동기화 필요
        category: {
          fastfood: '#FFE5D9',
          cafedessert: '#F4E4FF',
          chicken: '#FFF1B8',
          pizza: '#FFD6CC',
          bunsik: '#FFE0E0',
          buffet: '#E0F4E0',
          cvs: '#D9F0FF',
        },
      },
      fontFamily: {
        // 한국어 본문 우선
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        // 모바일 키오스크 시나리오에 맞춘 크기
        card: ['0.875rem', { lineHeight: '1.4' }],
        receipt: ['0.95rem', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};

export default preset;
