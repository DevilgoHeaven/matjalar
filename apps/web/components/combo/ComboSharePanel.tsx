'use client';

import { useMemo, useState } from 'react';
import { trackEvent } from '@/lib/analytics/events';

interface ComboSharePanelProps {
  comboId: string;
  title: string;
  orderText: string;
  orderSummary: string;
}

type ShareState = 'idle' | 'copied' | 'shared' | 'fallback';

export function ComboSharePanel({
  comboId,
  title,
  orderText,
  orderSummary,
}: ComboSharePanelProps) {
  const [state, setState] = useState<ShareState>('idle');
  const [isBusy, setIsBusy] = useState(false);
  const [showText, setShowText] = useState(false);
  const [fallbackText, setFallbackText] = useState(orderText);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/combo/${comboId}`;
    return `${window.location.origin}/combo/${comboId}`;
  }, [comboId]);
  const imageUrl = `/combo/${comboId}/opengraph-image`;

  async function copyOrder() {
    setIsBusy(true);
    void trackEvent({ type: 'order_copy', combo_id: comboId, source: 'detail' });
    setFallbackText(orderText);
    const ok = await copyText(orderText);
    setShowText(!ok);
    setState(ok ? 'copied' : 'fallback');
    setIsBusy(false);
  }

  async function shareCombo() {
    setIsBusy(true);
    const text = `${title}\n${orderSummary}\n${shareUrl}`;
    setFallbackText(text);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: orderSummary, url: shareUrl });
        void trackEvent({
          type: 'share_click',
          target_type: 'combo',
          target_id: comboId,
          channel: 'native',
        });
        setState('shared');
      } else {
        const ok = await copyText(text);
        void trackEvent({
          type: 'share_click',
          target_type: 'combo',
          target_id: comboId,
          channel: ok ? 'clipboard' : 'fallback',
        });
        setShowText(!ok);
        setState(ok ? 'copied' : 'fallback');
      }
    } catch {
      const ok = await copyText(text);
      void trackEvent({
        type: 'share_click',
        target_type: 'combo',
        target_id: comboId,
        channel: ok ? 'clipboard' : 'fallback',
      });
      setShowText(!ok);
      setState(ok ? 'copied' : 'fallback');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-black text-action">주문 치트키</h2>
          <p className="mt-1 break-keep text-sm leading-relaxed text-stone-600">
            {orderSummary}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-black text-stone-600">
          30초 컷
        </span>
      </div>

      <div className="mt-4 rounded-md bg-stone-50 p-3 text-sm font-semibold leading-relaxed text-action">
        {orderText.split('\n').map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void copyOrder()}
          className="min-h-11 rounded-lg bg-action px-3 text-sm font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-60"
        >
          주문문 복사
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void shareCombo()}
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-black text-action transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-60"
        >
          공유
        </button>
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            void trackEvent({
              type: 'share_click',
              target_type: 'combo',
              target_id: comboId,
              channel: 'image',
            })
          }
          className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-black text-action transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 sm:col-span-1"
        >
          이미지
        </a>
      </div>

      <p className="mt-3 min-h-5 text-xs font-bold text-stone-500" aria-live="polite">
        {state === 'copied'
          ? '복사했어요.'
          : state === 'shared'
            ? '공유창을 열었어요.'
            : state === 'fallback'
              ? '자동 복사가 막혀 아래 문장을 직접 선택해 주세요.'
              : ''}
      </p>

      {showText ? (
        <textarea
          readOnly
          value={fallbackText}
          className="mt-2 h-28 w-full rounded-lg border border-stone-300 bg-white p-3 text-sm font-semibold text-action"
        />
      ) : null}
    </section>
  );
}

async function copyText(value: string): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    !window.isSecureContext
  ) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
