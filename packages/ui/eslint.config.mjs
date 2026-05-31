/**
 * packages/ui ESLint 설정 (flat config)
 * - 공유 base + React JSX 컨텍스트
 */

import base from '@mzr/config/eslint';

export default [
  ...base,
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    ignores: ['dist/**', 'node_modules/**'],
  },
];
