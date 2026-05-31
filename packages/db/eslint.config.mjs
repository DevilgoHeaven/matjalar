/**
 * packages/db ESLint 설정 (flat config)
 * - 공유 base 규칙 상속 (no-img + admin import 차단 + console)
 * - 순수 모듈이라 React 규칙 불필요
 */

import base from '@mzr/config/eslint';

export default [
  ...base,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
