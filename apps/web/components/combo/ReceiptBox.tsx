import type { ComboOptionView } from '@/app/combo/[id]/data';

interface ReceiptBoxProps {
  menuName: string;
  variantName: string;
  basePrice: number;
  options: ComboOptionView[];
  estimatedPrice: number;
  priceStatus: string;
}

export function ReceiptBox({
  menuName,
  variantName,
  basePrice,
  options,
  estimatedPrice,
  priceStatus,
}: ReceiptBoxProps) {
  const grouped = groupOptions(options);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Price Check
          </p>
          <h2 className="mt-1 text-lg font-bold text-action">예상 결제 내역</h2>
          <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-stone-500">
            {priceStatus === 'exact'
              ? '공식가 기준으로 계산했습니다.'
              : '매장·앱 가격이 다를 수 있어 결제 전 한 번 더 확인해 주세요.'}
          </p>
        </div>
        <p className="text-right text-sm font-semibold text-action">
          {formatPrice(estimatedPrice, priceStatus)}
        </p>
      </div>

      <dl className="mt-5 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-200 pb-4">
          <dt className="text-sm text-gray-500">메인</dt>
          <dd className="text-right text-sm font-semibold text-action">
            {menuName} · {variantName}
            <span className="block text-xs font-normal text-gray-400">
              기본 {formatWon(basePrice)}
            </span>
          </dd>
        </div>

        {grouped.map(([groupName, items]) => (
          <div
            key={groupName}
            className="grid grid-cols-[5rem_1fr] gap-3 border-b border-dashed border-gray-100 pb-4 last:border-b-0 last:pb-0"
          >
            <dt className="text-sm font-medium text-gray-500">{groupName}</dt>
            <dd className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <ActionLabel actionType={item.actionType} />
                    <span className="ml-2 text-action">
                      {item.optionName}
                      {item.quantity > 1 ? ` x${item.quantity}` : ''}
                    </span>
                  </span>
                  {item.priceDelta ? (
                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDelta(item.priceDelta)}
                    </span>
                  ) : null}
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ActionLabel({ actionType }: { actionType: string }) {
  const label =
    actionType === 'exclude' ? '빼기' : actionType === 'add' ? '추가' : '선택';
  const className =
    actionType === 'exclude'
      ? 'text-exclude'
      : actionType === 'add'
        ? 'text-action'
        : 'text-gray-400';

  return <span className={`text-xs font-semibold ${className}`}>{label}</span>;
}

function groupOptions(options: ComboOptionView[]) {
  const map = new Map<string, ComboOptionView[]>();
  for (const option of options) {
    const current = map.get(option.groupName) ?? [];
    current.push(option);
    map.set(option.groupName, current);
  }
  return [...map.entries()];
}

function formatDelta(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatWon(value)}`;
}

function formatWon(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function formatPrice(value: number, status: string) {
  if (status === 'unknown') return '가격 확인중';
  const price = formatWon(value);
  return status === 'exact' ? price : `약 ${price}`;
}
