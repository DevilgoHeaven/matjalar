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
import { PageEvents } from '@/components/analytics/PageEvents';
import { ComboCard } from '@/components/combo/ComboCard';
import { CategoryTile } from '@/components/home/CategoryTile';
import { getHomePageData } from './data';

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
  const adminErrorKey = getFirstParam(resolved?.error);
  const adminErrorMessage = adminErrorKey
    ? mapAdminErrorMessage(adminErrorKey)
    : null;

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-action">
                맛잘알
              </h1>
              <p className="mt-1 text-sm font-medium leading-relaxed text-stone-500">
                <span className="block break-keep sm:inline">
                  프랜차이즈 꿀조합 카드
                </span>
                <span className="block break-keep sm:ml-1 sm:inline">
                  30초 탐색
                </span>
              </p>
            </div>
            <nav aria-label="빠른 이동" className="flex shrink-0 gap-2">
              <Link
                href="/bookmarks"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300 bg-white px-3 text-xs font-black text-action transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                찜
              </Link>
              <Link
                href="/combo/new"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-action px-3 text-xs font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                등록
              </Link>
            </nav>
          </div>

          <form action="/search" method="get" className="mt-5 flex gap-2">
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
              className="min-h-12 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium placeholder:text-stone-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-4 text-sm font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              검색
            </button>
          </form>
        </div>
      </header>

      {(authError || adminErrorMessage) && (
        <section className="mx-auto max-w-3xl px-5 pt-4">
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
          >
            {authError ? (
              <>
                <span className="block">로그인을 끝까지 마치지 못했어요</span>
                <span className="mt-1 block break-words text-xs font-medium text-red-600">
                  {authError}
                </span>
              </>
            ) : (
              <span className="block break-keep">{adminErrorMessage}</span>
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

function EmptyHotState() {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
      <p className="break-keep text-base font-bold text-action">
        오늘의 인기 조합이 준비되는 중이에요 ✨
      </p>
      <p className="mt-2 break-keep text-sm leading-relaxed text-stone-500">
        첫 조합이 등록되면 이곳에 표시됩니다.
      </p>
    </div>
  );
}

/**
 * middleware / OAuth callback 이 ?error=<key> 로 리디렉트할 때 사용자에게 보여줄 한글 메시지.
 * 알 수 없는 key 는 fallback 으로 일반 안내. raw key 노출 방지 (UX 갭 #2).
 */
function mapAdminErrorMessage(key: string): string {
  switch (key) {
    case 'admin_login_required':
      return '관리자 페이지는 로그인 후 이용할 수 있어요.';
    case 'admin_only':
      return '관리자 계정에만 열려 있는 페이지예요.';
    case 'missing_code':
      return '로그인 인증 코드가 누락됐어요. 다시 시도해 주세요.';
    default:
      return '잠깐 막힌 곳이 있어요. 잠시 후 다시 시도해 주세요.';
  }
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  return first.slice(0, 500);
}
