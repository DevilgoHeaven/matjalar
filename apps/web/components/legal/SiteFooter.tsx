import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-[#FAFAFA] px-5 py-6 text-action">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 text-xs font-semibold text-stone-500 sm:flex-row sm:items-center sm:justify-between">
        <p>맛잘알 · 프랜차이즈 꿀조합 위키</p>
        <nav aria-label="법적 고지" className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            className="inline-flex min-h-11 items-center rounded-md px-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            href="/terms"
          >
            이용약관
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-md px-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            href="/privacy"
          >
            개인정보 처리방침
          </Link>
        </nav>
      </div>
    </footer>
  );
}
