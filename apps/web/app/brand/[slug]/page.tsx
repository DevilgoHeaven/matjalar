import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_TOKENS } from '@mzr/ui';
import { PageEvents } from '@/components/analytics/PageEvents';
import { ComboCard } from '@/components/combo/ComboCard';
import { getBrandMetadata, getBrandPageData } from './data';

export const dynamic = 'force-dynamic';

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandMetadata(slug);

  if (!brand) {
    return {
      title: '브랜드를 찾을 수 없어요 — 맛잘알',
    };
  }

  return {
    title: `${brand.name} 꿀조합 — 맛잘알`,
    description: `${brand.name}에서 바로 따라 누를 수 있는 검증된 조합 카드.`,
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const data = await getBrandPageData(slug);

  if (!data) notFound();

  const gradient = CATEGORY_TOKENS.fastfood.gradient;

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <PageEvents
        events={[
          { type: 'page_view', pathname: `/brand/${data.brand.slug}` },
          {
            type: 'list_view',
            list_kind: 'brand',
            count: data.combos.length,
          },
        ]}
      />
      <section
        className="px-5 pb-8 pt-6"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-sm font-semibold text-action/70 underline-offset-4 hover:underline"
          >
            맛잘알
          </Link>
          <h1 className="mt-5 text-3xl font-black leading-tight text-action sm:text-4xl">
            {data.brand.name} 꿀조합
          </h1>
          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-action/75">
            키오스크 앞에서 오래 고민하지 않게, 바로 따라 누를 수 있는
            조합만 모읍니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-action/70">
            <span className="rounded-full bg-white/70 px-3 py-2">
              인기 탭
            </span>
            <span className="rounded-full bg-white/70 px-3 py-2">
              공개 {data.combos.length}개
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-6">
        {data.combos.length ? (
          <div className="grid gap-3">
            {data.combos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        ) : (
          <EmptyBrandState brandName={data.brand.name} />
        )}
      </section>
    </main>
  );
}

function EmptyBrandState({ brandName }: { brandName: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6">
      <p className="text-base font-bold text-action">
        아직 공개된 {brandName} 조합이 없습니다.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        관리자 seed 또는 조합 승인 흐름이 열리면 이곳에 인기 조합 카드가
        표시됩니다.
      </p>
    </div>
  );
}
