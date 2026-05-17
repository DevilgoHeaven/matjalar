'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleBookmark } from '@/app/actions/bookmarks';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { trackEvent } from '@/lib/analytics/events';

interface BookmarkButtonProps {
  comboId: string;
  initialBookmarked: boolean;
  initialBookmarkCount: number;
  isSignedIn: boolean;
}

interface BookmarkState {
  bookmarked: boolean;
  bookmarkCount: number;
}

export function BookmarkButton({
  comboId,
  initialBookmarked,
  initialBookmarkCount,
  isSignedIn,
}: BookmarkButtonProps) {
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<BookmarkState, boolean>(
    {
      bookmarked: initialBookmarked,
      bookmarkCount: initialBookmarkCount,
    },
    (current, nextBookmarked) => {
      if (current.bookmarked === nextBookmarked) return current;
      return {
        bookmarked: nextBookmarked,
        bookmarkCount: Math.max(
          0,
          current.bookmarkCount + (nextBookmarked ? 1 : -1)
        ),
      };
    }
  );

  const handleClick = () => {
    setError(null);

    if (!isSignedIn) {
      openAuthModal({ type: 'bookmark', comboId });
      return;
    }

    const nextBookmarked = !optimistic.bookmarked;
    startTransition(async () => {
      setOptimistic(nextBookmarked);
      void trackEvent({
        type: 'bookmark_click',
        combo_id: comboId,
        after: nextBookmarked ? 'on' : 'off',
      });

      const result = await toggleBookmark(comboId);
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        aria-pressed={optimistic.bookmarked}
        disabled={isPending}
        onClick={handleClick}
        className={[
          'inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bookmark focus-visible:ring-offset-2',
          optimistic.bookmarked
            ? 'bg-bookmark text-white'
            : 'border border-gray-300 bg-white text-action hover:border-gray-500',
          isPending ? 'opacity-70' : '',
        ].join(' ')}
      >
        <span aria-hidden="true">♥</span>
        <span>{optimistic.bookmarked ? '찜 완료' : '찜'}</span>
        <span>{optimistic.bookmarkCount}</span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-exclude">
          {error}
        </p>
      ) : null}
    </div>
  );
}
