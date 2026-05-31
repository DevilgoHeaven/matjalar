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
import type { ReactNode } from 'react';
import Link from 'next/link';
import { buildComboPersonality } from '@mzr/db';
import { PageEvents } from '@/components/analytics/PageEvents';
import { ComboCard } from '@/components/combo/ComboCard';
import { ComboVisual } from '@/components/combo/ComboVisual';
import { CategoryTile } from '@/components/home/CategoryTile';
import type { HomeHotCombo } from './data';
import { getHomePageData } from './data';

export const metadata: Metadata = {
  title: '맛잘알 — 프랜차이즈 꿀조합 위키',
  description:
    '서브웨이부터 시작하는 검증된 꿀조합 카드. 30초 안에 골라보세요.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '맛잘알 — 프랜차이즈 꿀조합 위키',
    description:
      '서브웨이부터 시작하는 검증된 꿀조합 카드. 30초 안에 골라보세요.',
    url: '/',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: '맛잘알 프랜차이즈 꿀조합 카드',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '맛잘알 — 프랜차이즈 꿀조합 위키',
    description:
      '서브웨이부터 시작하는 검증된 꿀조합 카드. 30초 안에 골라보세요.',
    images: ['/opengraph-image'],
  },
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

      <header className="border-b border-stone-200 bg-[#FFF8F1]">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-black tracking-tight text-action">
                맛잘알
              </p>
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
                href="/brand"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300 bg-white px-3 text-xs font-black text-action transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                브랜드
              </Link>
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

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="max-w-2xl break-keep text-4xl font-black leading-tight text-action sm:text-5xl">
                오늘 뭐 먹을지 30초 안에 끝내기
              </h1>
              <p className="mt-4 max-w-xl break-keep text-base font-semibold leading-relaxed text-stone-700">
                메뉴판 앞에서 멈추지 않게, 맛·가격·주문문까지 바로 이어지는 조합만 모았습니다.
              </p>

              <form action="/search" method="get" className="mt-6 flex gap-2">
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

              <div className="mt-4 flex flex-wrap gap-2">
                {DISCOVERY_LINKS.slice(0, 3).map((link) => (
                  <HeroLink key={link.href} href={link.href}>
                    {link.shortLabel}
                  </HeroLink>
                ))}
              </div>
            </div>

            <HeroCombo combo={data.hotCombos[0] ?? null} />
          </div>
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

      <section className="mx-auto max-w-5xl px-5 py-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-stone-500">
              CATEGORY
            </p>
            <h2 className="mt-1 text-lg font-black text-action">
              지금 고를 수 있는 프랜차이즈
            </h2>
          </div>
          <Link
            href="/brand"
            className="text-xs font-black text-action underline-offset-4 hover:underline"
          >
            전체 보기
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {data.categories.map((cat) => (
            <CategoryTile key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-6">
        <div className="grid gap-2 sm:grid-cols-3">
          <QuickLink
            href="/rankings/budget"
            eyebrow="만원컷"
            title="오늘 지갑에 맞추기"
            body="낮은 예상가와 주문 난이도를 같이 봅니다."
          />
          <QuickLink
            href="/rankings/beginner"
            eyebrow="초보추천"
            title="처음이어도 덜 헤매기"
            body="소스와 옵션이 과하지 않은 조합만 먼저 봅니다."
          />
          <QuickLink
            href="/quiz"
            eyebrow="취향퀴즈"
            title="친구에게 보낼 결과 만들기"
            body="3초 선택으로 오늘의 조합을 뽑고 바로 공유합니다."
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-stone-500">
              PICK BY MOMENT
            </p>
            <h2 className="mt-1 text-lg font-black text-action">
              지금 상황으로 바로 고르기
            </h2>
          </div>
          <Link
            href="/rankings"
            className="text-xs font-black text-action underline-offset-4 hover:underline"
          >
            전체 랭킹
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVERY_LINKS.map((link) => (
            <DiscoveryLink key={link.href} link={link} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-2">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-stone-500">
              HOT COMBOS
            </p>
            <h2 className="mt-1 text-2xl font-black text-action">
              오늘 바로 먹기 좋은 조합
            </h2>
          </div>
          <Link
            href="/rankings/hot"
            className="text-xs font-black text-action underline-offset-4 hover:underline"
          >
            랭킹 보기
          </Link>
        </div>
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
                  tags: combo.tags,
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

function HeroCombo({ combo }: { combo: HomeHotCombo | null }) {
  if (!combo) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white/70 p-4">
        <p className="text-sm font-black text-action">대표 조합 준비중</p>
        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-stone-500">
          첫 인기 조합이 생기면 여기서 바로 주문문까지 보여줍니다.
        </p>
      </div>
    );
  }

  const personality = buildComboPersonality({
    title: combo.title,
    cardSummary: combo.cardSummary,
    estimatedPrice: combo.estimatedPrice,
    priceStatus: combo.priceStatus,
  });

  return (
    <Link
      href={`/combo/${combo.id}`}
      className="group block overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      <ComboVisual
        personality={personality}
        title={combo.title}
        className="aspect-[16/10] rounded-none"
      />
      <div className="p-4">
        <p className="text-[11px] font-black tracking-widest text-stone-500">
          지금 많이 보는 조합 · {combo.brand.name}
        </p>
        <h2 className="mt-2 break-keep text-xl font-black leading-tight text-action">
          {combo.title}
        </h2>
        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-stone-600">
          {personality.reason}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-black text-action">
            {formatPrice(combo.estimatedPrice, combo.priceStatus)}
          </span>
          <span className="text-xs font-black text-action underline-offset-4 group-hover:underline">
            주문문 보기
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center rounded-full border border-stone-300 bg-white/80 px-3 text-xs font-black text-action transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

const DISCOVERY_LINKS = [
  {
    href: '/rankings/budget',
    shortLabel: '만원컷 보기',
    eyebrow: '월급 전',
    title: '지갑 덜 아픈 조합',
    body: '예상가와 주문 난이도를 같이 보고 바로 고릅니다.',
  },
  {
    href: '/quiz',
    shortLabel: '내 취향 찾기',
    eyebrow: '공유각',
    title: '친구에게 보낼 결과',
    body: '오늘 기준을 고르면 공유 가능한 추천 카드가 나옵니다.',
  },
  {
    href: '/rankings/spicy',
    shortLabel: '매운맛 랭킹',
    eyebrow: '입맛 없을 때',
    title: '끝맛 확실한 조합',
    body: '매콤한 소스와 옵션이 들어간 조합만 모아 봅니다.',
  },
  {
    href: '/rankings/beginner',
    shortLabel: '초보추천',
    eyebrow: '처음 주문',
    title: '덜 헤매는 안전 조합',
    body: '메뉴와 옵션 흐름이 단순한 조합부터 보여줍니다.',
  },
  {
    href: '/rankings/diet',
    shortLabel: '가볍게',
    eyebrow: '부담 줄이기',
    title: '산뜻하게 먹는 조합',
    body: '소스와 추가 토핑 부담이 낮은 선택지를 봅니다.',
  },
  {
    href: '/rankings/hearty',
    shortLabel: '든든한 점심',
    eyebrow: '오래 버티기',
    title: '한 끼감 있는 조합',
    body: '포만감이 남는 메뉴와 옵션 조합을 먼저 봅니다.',
  },
] as const;

function DiscoveryLink({
  link,
}: {
  link: (typeof DISCOVERY_LINKS)[number];
}) {
  return (
    <Link
      href={link.href}
      className="group rounded-lg border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-stone-500 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      <p className="text-[11px] font-black tracking-widest text-stone-500">
        {link.eyebrow}
      </p>
      <h3 className="mt-2 break-keep text-base font-black text-action">
        {link.title}
      </h3>
      <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-stone-500">
        {link.body}
      </p>
      <p className="mt-3 text-xs font-black text-action underline-offset-4 group-hover:underline">
        바로 보기
      </p>
    </Link>
  );
}

function QuickLink({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      <p className="text-[11px] font-black tracking-widest text-stone-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-base font-black text-action">{title}</h2>
      <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-stone-500">
        {body}
      </p>
    </Link>
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

function formatPrice(value: number, status: string) {
  if (status === 'unknown') return '가격 확인중';
  const price = `${new Intl.NumberFormat('ko-KR').format(value)}원`;
  return status === 'exact' ? price : `약 ${price}`;
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
