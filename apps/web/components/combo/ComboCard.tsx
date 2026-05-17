import Link from 'next/link';
import type { BrandListCombo } from '@/app/brand/[slug]/data';

interface ComboCardProps {
  combo: BrandListCombo;
}

export function ComboCard({ combo }: ComboCardProps) {
  return (
    <Link
      href={`/combo/${combo.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
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
