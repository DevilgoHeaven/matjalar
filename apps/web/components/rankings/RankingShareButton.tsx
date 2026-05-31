'use client';

import { useMemo, useState } from 'react';
import { buildTrackedSharePath } from '@mzr/db';
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
  const [isBusy, setIsBusy] = useState(false);
  const basePath = `/rankings/${rankingKind}`;
  const shareUrlFor = useMemo(
    () => (channel: 'native' | 'clipboard' | 'fallback') => {
      const trackedPath = buildTrackedSharePath({
        path: basePath,
        surface: 'ranking',
        channel,
        content: rankingKind,
      });
      if (typeof window === 'undefined') return trackedPath;
      return `${window.location.origin}${trackedPath}`;
    },
    [basePath, rankingKind]
  );

  async function shareRanking() {
    if (isBusy) return;
    setIsBusy(true);
    const clipboardUrl = shareUrlFor('clipboard');
    const text = `맛잘알 ${title}\n${description}\n${clipboardUrl}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        const nativeUrl = shareUrlFor('native');
        await navigator.share({ title: `맛잘알 ${title}`, text: description, url: nativeUrl });
        setState('shared');
        void trackEvent({
          type: 'share_click',
          target_type: 'ranking',
          target_id: rankingKind,
          channel: 'native',
          share_url_path: new URL(nativeUrl).pathname + new URL(nativeUrl).search,
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
        share_url_path: buildTrackedSharePath({
          path: basePath,
          surface: 'ranking',
          channel: copied ? 'clipboard' : 'fallback',
          content: rankingKind,
        }),
      });
    } catch {
      const copied = await copyText(text);
      setState(copied ? 'copied' : 'fallback');
      void trackEvent({
        type: 'share_click',
        target_type: 'ranking',
        target_id: rankingKind,
        channel: copied ? 'clipboard' : 'fallback',
        share_url_path: buildTrackedSharePath({
          path: basePath,
          surface: 'ranking',
          channel: copied ? 'clipboard' : 'fallback',
          content: rankingKind,
        }),
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => void shareRanking()}
        disabled={isBusy}
        className="inline-flex min-h-11 items-center rounded-full bg-action px-4 text-xs font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
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
