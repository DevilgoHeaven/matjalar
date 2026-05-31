'use client';

import { useMemo, useState } from 'react';
import { trackEvent } from '@/lib/analytics/events';

interface RankingShareButtonProps {
  rankingKind: string;
  title: string;
  description: string;
}

type ShareState = 'idle' | 'copied' | 'shared' | 'fallback';

export function RankingShareButton({
  rankingKind,
  title,
  description,
}: RankingShareButtonProps) {
  const [state, setState] = useState<ShareState>('idle');
  const url = useMemo(() => {
    if (typeof window === 'undefined') return `/rankings/${rankingKind}`;
    return `${window.location.origin}/rankings/${rankingKind}`;
  }, [rankingKind]);

  async function shareRanking() {
    const text = `맛잘알 ${title}\n${description}\n${url}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `맛잘알 ${title}`, text: description, url });
        setState('shared');
        void trackEvent({
          type: 'share_click',
          target_type: 'ranking',
          target_id: rankingKind,
          channel: 'native',
        });
        return;
      }
      const copied = await copyText(text);
      setState(copied ? 'copied' : 'fallback');
      void trackEvent({
        type: 'share_click',
        target_type: 'ranking',
        target_id: rankingKind,
        channel: copied ? 'clipboard' : 'fallback',
      });
    } catch {
      const copied = await copyText(text);
      setState(copied ? 'copied' : 'fallback');
      void trackEvent({
        type: 'share_click',
        target_type: 'ranking',
        target_id: rankingKind,
        channel: copied ? 'clipboard' : 'fallback',
      });
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => void shareRanking()}
        className="inline-flex min-h-11 items-center rounded-full bg-action px-4 text-xs font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        랭킹 공유
      </button>
      <p className="min-h-4 text-xs font-bold text-stone-500" aria-live="polite">
        {state === 'copied'
          ? '링크를 복사했어요.'
          : state === 'shared'
            ? '공유창을 열었어요.'
            : state === 'fallback'
              ? '복사가 막혔어요. 주소창 링크를 복사해 주세요.'
              : ''}
      </p>
    </div>
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
