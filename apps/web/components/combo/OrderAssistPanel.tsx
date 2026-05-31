import type { ComboPersonality } from '@mzr/db';

interface OrderAssistPanelProps {
  personality: ComboPersonality;
  orderText: string;
  orderSummary: string;
  priceStatus: string;
  sourceCount: number;
}

export function OrderAssistPanel({
  personality,
  orderText,
  orderSummary,
  priceStatus,
  sourceCount,
}: OrderAssistPanelProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-widest text-stone-500">
            ORDER GUIDE
          </p>
          <h2 className="mt-1 text-lg font-black text-action">
            매장 앞에서 이렇게 말하면 됩니다
          </h2>
        </div>
        <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">
          {personality.badgeLabel}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-stone-50 p-4">
        <p className="text-xs font-black tracking-widest text-stone-500">
          그대로 읽기
        </p>
        <div className="mt-2 break-keep text-sm font-black leading-relaxed text-action">
          {orderText.split('\n').map((line, index) => (
            <p key={`${index}-${line}`}>{line}</p>
          ))}
        </div>
        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-stone-600">
          {personality.orderTip}
        </p>
      </div>

      <ol className="mt-4 grid gap-2 text-sm font-semibold text-stone-600 sm:grid-cols-3">
        <AssistStep index={1} title="메뉴 먼저" body={orderSummary} />
        <AssistStep
          index={2}
          title="옵션 순서"
          body="빵, 치즈, 야채, 소스 순서로 읽습니다."
        />
        <AssistStep
          index={3}
          title="가격 확인"
          body={
            priceStatus === 'exact'
              ? '공식가 기준입니다.'
              : '매장 가격은 한 번 더 확인합니다.'
          }
        />
      </ol>

      <p className="mt-4 break-keep text-xs font-bold leading-relaxed text-stone-500">
        출처 {sourceCount ? `${sourceCount}건` : '확인 전'} · 공개 가격은
        제보와 운영자 확인 후 보정됩니다.
      </p>
    </section>
  );
}

function AssistStep({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-md border border-stone-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-action text-xs font-black text-white">
          {index}
        </span>
        <span className="font-black text-action">{title}</span>
      </div>
      <p className="mt-2 break-keep text-xs leading-relaxed text-stone-500">
        {body}
      </p>
    </li>
  );
}
