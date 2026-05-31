// apps/web 의 Tailwind 설정
// - packages/config/tailwind 의 preset 을 상속해 디자인 토큰 일관성 유지
// - content 는 apps/web 자기 자신 + 워크스페이스 ui 패키지 모두 스캔

import type { Config } from 'tailwindcss';
import preset from '@mzr/config/tailwind/preset';

const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
