import { defineConfig } from 'vitest/config';

// vitest 설정 — packages/db 의 순수 함수 단위 테스트
// 한국어 NFC 정규화·SHA256 해시·가격 계산 검증
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      enabled: false,
      reporter: ['text', 'html'],
    },
  },
});
