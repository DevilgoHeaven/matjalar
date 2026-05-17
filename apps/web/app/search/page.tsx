import type { Metadata } from 'next';
import { PageEvents } from '@/components/analytics/PageEvents';
import { ComboCard } from '@/components/combo/ComboCard';
import { searchCombos } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '검색 - 맛잘알',
};

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = getFirstParam(resolvedSearchParams?.q)?.slice(0, 80) ?? '';
  const results = query ? await searchCombos(query) : [];

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-5 py-8 text-action">
      <PageEvents
        events={[
          { type: 'page_view', pathname: query ? `/search?q=${query}` : '/search' },
          { type: 'list_view', list_kind: 'search', count: results.length },
        ]}
      />
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-gray-200 pb-6">
          <p className="text-xs font-bold text-gray-500">검색</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">조합 찾기</h1>
          <form action="/search" className="mt-5 flex gap-2">
            <input
              name="q"
              defaultValue={query}
              maxLength={80}
              placeholder="메뉴, 소스, 태그로 검색"
              className="h-11 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold outline-none focus:border-action focus:ring-2 focus:ring-action/10"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-action px-4 text-sm font-black text-white transition hover:bg-gray-800"
            >
              검색
            </button>
          </form>
        </div>

        {query ? (
          <p className="mt-5 text-sm font-semibold text-gray-500">
            {results.length}개 결과
          </p>
        ) : null}

        {results.length ? (
          <div className="mt-4 grid gap-3">
            {results.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm font-semibold text-gray-500">
            {query ? '검색 결과가 없습니다.' : '찾고 싶은 메뉴나 옵션을 입력해 주세요.'}
          </p>
        )}
      </div>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}
