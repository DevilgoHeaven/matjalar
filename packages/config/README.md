# @mzr/config

공유 설정 패키지: ESLint, Prettier, TypeScript, Tailwind CSS

## 사용법

### ESLint

#### 기본 설정 (모든 패키지)

```js
// eslint.config.js
import config from '@mzr/config/eslint';

export default config;
```

#### Next.js 앱 (jsx-runtime)

```js
// apps/web/eslint.config.js
import config from '@mzr/config/eslint/nextjs';

export default config;
```

### Prettier

```js
// prettier.config.js
export { default } from '@mzr/config/prettier';
```

### TypeScript

#### 기본 설정

```json
{
  "extends": "@mzr/config/tsconfig/base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### Next.js 설정

```json
{
  "extends": "@mzr/config/tsconfig/nextjs.json"
}
```

### Tailwind CSS

```js
// tailwind.config.ts
import preset from '@mzr/config/tailwind/preset';

export default {
  presets: [preset],
};
```

## 강제 규칙

- **no-img** (Custom): `<img>`, `next/image` 사용 금지 (이미지 정책)
- **no-restricted-imports**: `lib/supabase/admin` 은 `/admin` 또는 `/actions/admin` 경로 외에서 import 금지 (service_role 보안)

## 플러그인

- `prettier-plugin-tailwindcss`: Tailwind 클래스 자동 정렬
