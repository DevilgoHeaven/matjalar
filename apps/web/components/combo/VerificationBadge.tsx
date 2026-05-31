interface VerificationBadgeProps {
  priceStatus: string;
  lastVerifiedAt?: string | null;
  reviewCount?: number;
  sourceCount?: number;
  lastSourceObservedAt?: string | null;
}

export function VerificationBadge({
  priceStatus,
  lastVerifiedAt,
  reviewCount,
  sourceCount,
  lastSourceObservedAt,
}: VerificationBadgeProps) {
  const status = getPriceStatus(priceStatus);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
      <span className={`rounded-full px-2.5 py-1 ${status.className}`}>
        {status.label}
      </span>
      {lastVerifiedAt ? (
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-action/70 ring-1 ring-stone-200">
          검증 {formatDate(lastVerifiedAt)}
        </span>
      ) : null}
      {typeof reviewCount === 'number' ? (
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-action/70 ring-1 ring-stone-200">
          후기 {new Intl.NumberFormat('ko-KR').format(reviewCount)}
        </span>
      ) : null}
      {typeof sourceCount === 'number' && sourceCount > 0 ? (
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-action/70 ring-1 ring-stone-200">
          출처 {new Intl.NumberFormat('ko-KR').format(sourceCount)}건
        </span>
      ) : null}
      {lastSourceObservedAt ? (
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-action/70 ring-1 ring-stone-200">
          출처 확인 {formatDate(lastSourceObservedAt)}
        </span>
      ) : null}
    </div>
  );
}

function getPriceStatus(priceStatus: string) {
  if (priceStatus === 'exact') {
    return {
      label: '공식가 확인',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };
  }
  if (priceStatus === 'unknown') {
    return {
      label: '가격 확인중',
      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    };
  }
  return {
    label: '가격 추정',
    className: 'bg-stone-100 text-stone-600 ring-1 ring-stone-200',
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
