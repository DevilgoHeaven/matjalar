import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type {
  GrowthComboSeed,
  GrowthSeedBrand,
  GrowthSeedCategory,
} from '@mzr/db';
import { getAdminContentBacklogData } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '콘텐츠 확장 후보 - 맛잘알 Admin',
};

export default async function AdminContentBacklogPage() {
  const { seeds, summary } = await getAdminContentBacklogData();

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              콘텐츠 확장 후보
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              SNS·커뮤니티·공식 페이지 기반 후보를 공개 전 검증합니다. 가격은
              운영자 확인 전까지 추정가로만 유지합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminLink href="/admin">대시보드</AdminLink>
            <AdminLink href="/admin/source-refs">데이터 신뢰도</AdminLink>
            <AdminLink href="/admin/seed">시드 등록</AdminLink>
          </div>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="전체 후보" value={summary.total} />
          {summary.byCategory.map((item) => (
            <MetricCard
              key={item.category}
              label={formatCategory(item.category)}
              value={item.count}
            />
          ))}
          <MetricCard label="검증 필요" value={summary.total} />
          <MetricCard label="공식가 발행" value={0} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">브랜드별 후보</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summary.byBrand.map((item) => (
                <BrandCard
                  key={item.brandSlug}
                  brandSlug={item.brandSlug}
                  count={item.count}
                />
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">승격 기준</h2>
            <ol className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-stone-600">
              <li>1. 브랜드, 메뉴, 옵션 카탈로그 row를 먼저 만든다.</li>
              <li>2. 공식 페이지 또는 운영자 현장 확인 전에는 추정가로 둔다.</li>
              <li>3. 커뮤니티 표현은 복사하지 않고 운영자 문장으로 다시 쓴다.</li>
              <li>4. 공개 후 제보는 최근 제보와 데이터 신뢰도에서 처리한다.</li>
            </ol>
          </aside>
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">후보 40개</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {seeds.map((seed) => (
              <SeedCard key={`${seed.brandSlug}-${seed.title}`} seed={seed} />
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">조사 출처</h2>
          <div className="mt-4 grid gap-2">
            {summary.sourceUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-600 underline-offset-4 hover:border-stone-400 hover:underline"
              >
                {url}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
    >
      {children}
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function BrandCard({
  brandSlug,
  count,
}: {
  brandSlug: GrowthSeedBrand;
  count: number;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm font-black">{formatBrand(brandSlug)}</p>
      <p className="mt-2 text-2xl font-black">{count}</p>
      <p className="mt-1 text-xs font-semibold text-stone-500">
        모두 미검증 후보 · 공개 전 카탈로그 매핑 필요
      </p>
    </div>
  );
}

function SeedCard({ seed }: { seed: GrowthComboSeed }) {
  return (
    <article className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill>{formatCategory(seed.category)}</StatusPill>
        <StatusPill>{formatBrand(seed.brandSlug)}</StatusPill>
        <StatusPill>{formatPriceStatus(seed.priceStatus)}</StatusPill>
        <StatusPill>{formatConfidence(seed.confidence)}</StatusPill>
      </div>
      <h3 className="mt-3 text-base font-black">{seed.title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-stone-600">
        {seed.cardSummary}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {seed.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-stone-500"
          >
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-stone-600">
      {children}
    </span>
  );
}

function formatCategory(value: GrowthSeedCategory) {
  const labels: Record<GrowthSeedCategory, string> = {
    cvs: '편의점',
    burger: '버거',
  };
  return labels[value];
}

function formatBrand(value: GrowthSeedBrand) {
  const labels: Record<GrowthSeedBrand, string> = {
    gs25: 'GS25',
    cu: 'CU',
    mcdonalds: "McDonald's",
    burgerking: 'Burger King',
  };
  return labels[value];
}

function formatPriceStatus(value: GrowthComboSeed['priceStatus']) {
  const labels: Record<GrowthComboSeed['priceStatus'], string> = {
    approx: '추정가',
  };
  return labels[value];
}

function formatConfidence(value: GrowthComboSeed['confidence']) {
  const labels: Record<GrowthComboSeed['confidence'], string> = {
    unverified: '미검증',
  };
  return labels[value];
}
