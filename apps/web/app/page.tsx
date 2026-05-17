/**
 * 카테고리 홈 (/) — PRD §5 v1 카테고리 홈
 *
 * 구성:
 *  - 헤더: 로고 + 인사말 + 검색바 (GET /search?q=...)
 *  - 카테고리 그리드 (작게, 7종, active 브랜드 없는 카테고리는 "준비중" 배지)
 *  - 오늘의 인기 조합 (큰 영역, combo_stats.hot_score DESC 6개)
 *
 * 비회원/회원 분기 없음 — PRD §4: 홈은 공개, 따봉/찜/등록 시 로그인 모달.
 * authError / error 쿼리스트링 (OAuth 실패, /admin 차단)은 헤더 아래에 alert.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_TOKENS, type CategoryKey } from '@mzr/ui';
import { PageEvents } from '@/components/analytics/PageEvents';
import { ComboCard } from '@/components/combo/ComboCard';
import { getHomePageData, type HomeCategory } from './data';

export const metadata: Metadata = {
  title: '맛잘알 — 프랜차이즈 꿀조합 위키',
  description:
    '서브웨이부터 시작하는 검증된 꿀조합 카드. 30초 안에 골라보세요.',
};

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolved = await searchParams;
  const authError = getFirstParam(resolved?.auth_error);
  const adminError = getFirstParam(resolved?.error);

  const data = await getHomePageData();

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <PageEvents
        events={[
          { type: 'page_view', pathname: '/' },
          {
            type: 'list_view',
            list_kind: 'home',
            count: data.hotCombos.length,
          },
        ]}
      />

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <h1 className="text-2xl font-black tracking-tight text-action">
            맛잘알
          </h1>
          <p className="mt-1 text-sm font-medium leading-relaxed text-stone-500">
            프랜차이즈 꿀조합 카드 — 30초 탐색
          </p>

          <form action="/search" method="get" className="mt-5">
            <label htmlFor="home-search" className="sr-only">
              조합 검색
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              maxLength={80}
              autoComplete="off"
              placeholder="조합·메뉴·옵션 검색 (예: BMT, 사웨)"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium placeholder:text-stone-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </form>
        </div>
      </header>

      {(authError || adminError) && (
        <section className="mx-auto max-w-3xl px-5 pt-4">
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
          >
            {authError ? (
              <>
                <span className="block">OAuth 로그인 실패</span>
                <span className="mt-1 block break-words text-xs font-medium text-red-600">
                  {authError}
                </span>
              </>
            ) : (
              <span>{adminError}</span>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-5 py-6">
        <h2 className="mb-3 text-xs font-bold tracking-widest text-stone-500">
          카테고리
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {data.categories.map((cat) => (
            <CategoryTile key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-12 pt-2">
        <h2 className="mb-4 text-lg font-black text-action">
          오늘의 인기 조합
        </h2>
        {data.hotCombos.length > 0 ? (
          <div className="grid gap-3">
            {data.hotCombos.map((combo) => (
              <ComboCard
                key={combo.id}
                combo={{
                  id: combo.id,
                  title: combo.title,
                  cardSummary: combo.cardSummary,
                  estimatedPrice: combo.estimatedPrice,
                  priceStatus: combo.priceStatus,
                  publishedAt: null,
                  stats: {
                    voteCount: combo.stats.voteCount,
                    reviewCount: combo.stats.reviewCount,
                    averageRating: combo.stats.averageRating,
                    hotScore: combo.stats.hotScore,
                  },
                  tags: [],
                }}
                brand={{ name: combo.brand.name }}
              />
            ))}
          </div>
        ) : (
          <EmptyHotState />
        )}
      </section>
    </main>
  );
}

function CategoryTile({ category }: { category: HomeCategory }) {
  const token = CATEGORY_TOKENS[category.id as CategoryKey];
  const gradient = token?.gradient ?? (['#F5F5F5', '#E5E5E5'] as const);

  const tileInner = (
    <div
      className="flex aspect-square flex-col items-center justify-center rounded-xl p-2 text-center transition"
      style={{
        background: category.isActive
          ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
          : '#F5F5F5',
        opacity: category.isActive ? 1 : 0.55,
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {category.emoji}
      </span>
      <span className="mt-1 text-[11px] font-bold leading-tight text-action">
        {category.label}
      </span>
      {!category.isActive && (
        <span className="mt-1 rounded-full bg-stone-200 px-1.5 py-0.5 text-[9px] font-semibold text-stone-600">
          준비중
        </span>
      )}
    </div>
  );

  if (category.isActive && category.primaryBrandSlug) {
    return (
      <Link
        href={`/brand/${category.primaryBrandSlug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        prefetch={false}
      >
        {tileInner}
      </Link>
    );
  }

  return (
    <div
      role="button"
      aria-disabled="true"
      tabIndex={-1}
      title="아직 준비 중인 카테고리예요"
      className="cursor-not-allowed"
    >
      {tileInner}
    </div>
  );
}

function EmptyHotState() {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
      <p className="text-base font-bold text-action">
        오늘의 인기 조합이 준비되는 중이에요 ✨
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        첫 조합이 등록되면 이곳에 표시됩니다.
      </p>
    </div>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  return first.slice(0, 500);
}
