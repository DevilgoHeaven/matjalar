import type { Metadata } from 'next';
import Link from 'next/link';
import { PageEvents } from '@/components/analytics/PageEvents';
import { getBrandDirectoryData } from './data';

export const metadata: Metadata = {
  title: '브랜드 - 맛잘알',
  description: '맛잘알에서 준비된 브랜드와 다음 확장 후보를 확인하세요.',
};

export default async function BrandDirectoryPage() {
  const brands = await getBrandDirectoryData();

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <PageEvents events={[{ type: 'page_view', pathname: '/brand' }]} />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-bold text-stone-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            맛잘알
          </Link>
          <h1 className="mt-4 text-3xl font-black text-action">브랜드</h1>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-stone-600">
            지금은 검증된 브랜드부터 열고, 다음 확장은 가격·옵션 데이터가 준비되는 순서로 붙입니다.
          </p>
        </div>
      </header>

      <section className="mx-auto grid max-w-3xl gap-3 px-5 py-6">
        {brands.map((brand) =>
          brand.isActive ? (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              <BrandContent brand={brand} />
            </Link>
          ) : (
            <div
              key={brand.id}
              className="rounded-lg border border-dashed border-stone-300 bg-white p-4 opacity-75"
            >
              <BrandContent brand={brand} />
            </div>
          )
        )}
      </section>
    </main>
  );
}

function BrandContent({
  brand,
}: {
  brand: Awaited<ReturnType<typeof getBrandDirectoryData>>[number];
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black text-stone-500">
          {brand.category.emoji} {brand.category.label}
        </p>
        <h2 className="mt-1 text-lg font-black text-action">{brand.name}</h2>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          brand.isActive
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-stone-100 text-stone-600 ring-1 ring-stone-200'
        }`}
      >
        {brand.isActive ? '공개중' : '준비중'}
      </span>
    </div>
  );
}
