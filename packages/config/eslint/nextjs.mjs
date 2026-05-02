/**
 * Next.js 15 앱 ESLint 설정 (flat config)
 *
 * - base 규칙(TS + no-img + admin import 차단) 상속
 * - @next/eslint-plugin-next 권장 규칙 (Link, Script, no-html-link-for-pages 등)
 * - eslint-plugin-react JSX 권장 + react-hooks 규칙
 * - React 19 + JSX runtime 자동 import (in-jsx-scope OFF)
 */

import base from './index.mjs';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  ...base,

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    plugins: {
      '@next/next': nextPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Next.js 권장
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // React 권장
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,

      // React Hooks 권장
      ...reactHooksPlugin.configs.recommended.rules,

      // React 19 + Next.js 15 — jsx runtime 자동
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];
