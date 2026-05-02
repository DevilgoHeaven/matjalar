/**
 * apps/web 의 ESLint 설정
 * - 공유 @mzr/config/eslint/nextjs 를 상속 (no-img + base no-restricted-imports 포함)
 * - 추가로 lib/supabase/admin import 차단을 명시적으로 한 번 더 선언 (C-2 review, R-04)
 *   → eslint-config-next 가 spread 되면서 규칙이 덮이는 사고 방지
 */

import nextConfig from '@mzr/config/eslint/nextjs';

export default [
  ...nextConfig,
  {
    // /admin 경로 외에서 admin 클라이언트 import 차단 — 명시적 이중 안전장치
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/supabase/admin', '**/lib/supabase/admin.ts', '@/lib/supabase/admin'],
              message:
                '⚠️ admin 클라이언트는 app/admin/** 또는 app/actions/admin/** 에서만 import 가능합니다 (R-04 service_role 누출 방지)',
            },
          ],
        },
      ],
    },
  },
  {
    // /admin 경로는 admin 클라이언트 import 허용
    files: ['app/admin/**/*.{ts,tsx}', 'app/actions/admin/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'public/sw.js'],
  },
];
