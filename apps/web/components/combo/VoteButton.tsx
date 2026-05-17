'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleVote } from '@/app/actions/votes';
import { trackEvent } from '@/lib/analytics/events';
import { useAuthModal } from '@/components/auth/AuthModalProvider';

interface VoteButtonProps {
  comboId: string;
  initialVoted: boolean;
  initialVoteCount: number;
  isSignedIn: boolean;
}

interface VoteState {
  voted: boolean;
  voteCount: number;
}

export function VoteButton({
  comboId,
  initialVoted,
  initialVoteCount,
  isSignedIn,
}: VoteButtonProps) {
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<VoteState, boolean>(
    { voted: initialVoted, voteCount: initialVoteCount },
    (current, nextVoted) => {
      if (current.voted === nextVoted) return current;
      return {
        voted: nextVoted,
        voteCount: Math.max(
          0,
          current.voteCount + (nextVoted ? 1 : -1)
        ),
      };
    }
  );

  const handleClick = () => {
    setError(null);

    if (!isSignedIn) {
      openAuthModal({ type: 'vote', comboId });
      return;
    }

    const nextVoted = !optimistic.voted;
    startTransition(async () => {
      setOptimistic(nextVoted);
      void trackEvent({
        type: 'vote_click',
        combo_id: comboId,
        after: nextVoted ? 'on' : 'off',
      });

      const result = await toggleVote(comboId);
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
        aria-pressed={optimistic.voted}
        disabled={isPending}
        onClick={handleClick}
        className={[
          'inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2',
          optimistic.voted
            ? 'bg-action text-white'
            : 'border border-gray-300 bg-white text-action hover:border-gray-500',
          isPending ? 'opacity-70' : '',
        ].join(' ')}
      >
        <span aria-hidden="true">👍</span>
        <span>{optimistic.voted ? '따봉 완료' : '따봉'}</span>
        <span>{optimistic.voteCount}</span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-exclude">
          {error}
        </p>
      ) : null}
    </div>
  );
}
