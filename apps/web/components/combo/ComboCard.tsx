import Link from 'next/link';
import type { BrandListCombo } from '@/app/brand/[slug]/data';

interface ComboCardProps {
  combo: BrandListCombo;
  /**
   * 여러 브랜드 카드가 한 리스트에 섞일 때 (예: 카테고리 홈) 브랜드 라벨 표시.
   * brand/[slug] 페이지에서는 브랜드 컨텍스트가 이미 있으므로 생략.
   */
  brand?: { name: string };
}

export function ComboCard({ combo, brand }: ComboCardProps) {
  return (
    <Link
      href={`/combo/${combo.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {brand ? (
            <p className="mb-1 text-[11px] font-bold tracking-wide text-stone-500">
              {brand.name}
            </p>
          ) : null}
          <h2 className="text-base font-extrabold leading-snug text-action">
            {combo.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">
            {combo.cardSummary}
          </p>
        </div>
        <p className="shrink-0 text-right text-sm font-bold text-action">
          {formatPrice(combo.estimatedPrice, combo.priceStatus)}
        </p>
      </div>

      {combo.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {combo.tags.map((tag) => (
            <span
              key={tag.label}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
            >
              {tag.emoji ? `${tag.emoji} ` : ''}
              {tag.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500">
        <span>따봉 {formatNumber(combo.stats.voteCount)}</span>
        <span>별점 {combo.stats.averageRating.toFixed(1)}</span>
        <span>후기 {formatNumber(combo.stats.reviewCount)}</span>
      </div>
    </Link>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPrice(value: number, status: string) {
  if (status === 'unknown') return '가격 확인중';
  const price = `${new Intl.NumberFormat('ko-KR').format(value)}원`;
  return status === 'exact' ? price : `약 ${price}`;
}
