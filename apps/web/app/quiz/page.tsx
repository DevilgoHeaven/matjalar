import type { Metadata } from 'next';
import Link from 'next/link';
import { PageEvents } from '@/components/analytics/PageEvents';
import { QuizClient } from './QuizClient';
import { getQuizPageData } from './data';
import { parseQuizPreferences } from './preferences';

export const metadata: Metadata = {
  title: '취향 퀴즈 - 맛잘알',
  description: '가격, 초보추천, 매운맛, 든든함 기준으로 오늘 먹을 조합을 고르세요.',
};

interface QuizPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const [combos, resolvedSearchParams] = await Promise.all([
    getQuizPageData(),
    searchParams,
  ]);
  const prefs = parseQuizPreferences(getFirstParam(resolvedSearchParams?.prefs));

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <PageEvents events={[{ type: 'page_view', pathname: '/quiz' }]} />
      <header className="border-b border-stone-200 bg-[#FFF8F1]">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-bold text-stone-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            맛잘알
          </Link>
          <p className="mt-4 w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-action ring-1 ring-stone-200">
            결과 링크까지 바로 공유
          </p>
          <h1 className="mt-3 break-keep text-4xl font-black leading-tight text-action sm:text-5xl">
            <span className="block">오늘 뭐 먹을지</span>
            <span className="block">3초 컷</span>
          </h1>
          <p className="mt-3 max-w-2xl break-keep text-base font-semibold leading-relaxed text-stone-700">
            가격, 매운맛, 든든함 같은 기준을 고르면 친구에게 보낼 추천 카드까지 바로 만듭니다.
          </p>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-5 py-6">
        <QuizClient combos={combos} initialPreferences={prefs} />
      </section>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}
