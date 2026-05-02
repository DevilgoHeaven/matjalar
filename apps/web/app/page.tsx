/**
 * 카테고리 홈 (/) — 임시 골격
 *
 * - M6 에서 본격 구현: 빈 카테고리 "준비중" 배지 + 토스트, 오늘의 인기 조합
 * - 지금은 환경 셋업 검증용 placeholder
 */

export default function HomePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">맛잘알</h1>
      <p className="mt-2 text-sm text-gray-600">
        프랜차이즈 메뉴와 꿀조합 위키. 곧 만나요.
      </p>
      <p className="mt-4 text-xs text-gray-400">
        v0.1.0 · M0 셋업 검증 페이지
      </p>
    </main>
  );
}
