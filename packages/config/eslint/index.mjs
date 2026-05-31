/**
 * 공유 ESLint flat config (모든 패키지 base)
 *
 * 강제 규칙:
 *  - typescript-eslint 권장 — TS 파싱 + 기본 규칙
 *  - no-img (custom) : <img>, next/image 사용 금지 (PRD §11 / R-14)
 *  - no-restricted-imports : lib/supabase/admin 은 /admin 외 import 금지 (R-04)
 *  - no-console (warn 만)
 *
 * 사용법:
 *   import config from '@mzr/config/eslint';
 *   export default [...config, ...];  // 추가 규칙은 spread 뒤에 객체로
 */

import tseslint from 'typescript-eslint';
import noImgRule from './rules/no-img.cjs';

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // TypeScript 파싱·권장 규칙 (Flat config)
  ...tseslint.configs.recommended,

  // 프로젝트 공통 규칙
  {
    plugins: {
      mzr: {
        rules: {
          'no-img': noImgRule,
        },
      },
    },
    rules: {
      // 카드/UI 컴포넌트에 이미지 노출 금지 (R-14)
      'mzr/no-img': 'error',

      // service_role 키 누출 방지 (R-04, C-2 review)
      // 절대·상대·workspace alias 모든 경로 패턴 차단
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/lib/supabase/admin',
                '**/lib/supabase/admin.ts',
                '@/lib/supabase/admin',
                '@mzr/*/lib/supabase/admin',
                '@mzr/*/admin',
              ],
              message:
                '⚠️ admin 클라이언트는 /admin/** 또는 /actions/admin/** 에서만 import 가능합니다 (R-04 service_role 누출 방지)',
            },
          ],
        },
      ],

      // 일반 권장
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      'no-debugger': 'error',

      // TS 권장 규칙 일부 완화 (M0 셋업 단계, 필요 시 끌어올림)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // /admin 경로는 admin 클라이언트 import 허용 — overrides (C-2: .tsx 보강)
  {
    files: [
      '**/admin/**/*.ts',
      '**/admin/**/*.tsx',
      '**/actions/admin/**/*.ts',
      '**/actions/admin/**/*.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default config;
