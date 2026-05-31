/**
 * 공유 Prettier 설정
 * - 한국어·영문 혼용 코드 가독성 우선
 * - tailwind 클래스 정렬 플러그인 포함
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSpacing: true,
  plugins: ['prettier-plugin-tailwindcss'],
};
