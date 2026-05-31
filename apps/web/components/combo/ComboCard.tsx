import Link from 'next/link';
import { buildComboPersonality } from '@mzr/db';
import type { BrandListCombo } from '@/app/brand/[slug]/data';
import { ComboVisual } from './ComboVisual';
import { VerificationBadge } from './VerificationBadge';

interface ComboCardProps {
  combo: BrandListCombo;
  /**
   * 여러 브랜드 카드가 한 리스트에 섞일 때 (예: 카테고리 홈) 브랜드 라벨 표시.
   * brand/[slug] 페이지에서는 브랜드 컨텍스트가 이미 있으므로 생략.
   */
  brand?: { name: string };
}

export function ComboCard({ combo, brand }: ComboCardProps) {
  const personality = buildComboPersonality({
    title: combo.title,
    cardSummary: combo.cardSummary,
    estimatedPrice: combo.estimatedPrice,
    priceStatus: combo.priceStatus,
    tagLabels: combo.tags.map((tag) => tag.label),
  });

  return (
    <Link
      href={`/combo/${combo.id}`}
      className="group block overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
    >
      <div className="grid gap-0 sm:grid-cols-[176px_1fr]">
        <ComboVisual
          personality={personality}
          title={combo.title}
          className="aspect-[16/10] rounded-none sm:aspect-auto sm:h-full sm:min-h-44 sm:w-full"
        />
        <div className="p-4">
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
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-gray-600">
                {combo.cardSummary}
              </p>
            </div>
            <p className="shrink-0 text-right text-sm font-black text-action">
              {formatPrice(combo.estimatedPrice, combo.priceStatus)}
            </p>
          </div>

          <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-stone-700">
            {personality.appetiteLine}
          </p>
          <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-stone-500">
            {personality.situation}
          </p>

          <div className="mt-3">
            <VerificationBadge priceStatus={combo.priceStatus} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
              {personality.badgeLabel}
            </span>
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-500">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span>따봉 {formatNumber(combo.stats.voteCount)}</span>
              <span>별점 {combo.stats.averageRating.toFixed(1)}</span>
              <span>후기 {formatNumber(combo.stats.reviewCount)}</span>
            </div>
            <span className="font-black text-action underline-offset-4 group-hover:underline">
              주문 보기
            </span>
          </div>
        </div>
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
