'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleReviewVote } from '@/app/actions/review-votes';
import { useAuthModal } from '@/components/auth/AuthModalProvider';

interface ReviewVoteButtonProps {
  reviewId: string;
  comboId: string;
  initialVoted: boolean;
  initialVoteCount: number;
  isSignedIn: boolean;
  tone?: 'light' | 'dark';
}

interface ReviewVoteState {
  voted: boolean;
  voteCount: number;
}

/**
 * 후기 따봉 버튼.
 *
 * 조합 따봉과 별도로 review_votes 에 저장되며, 대표 후기 선정의 입력값으로 쓰인다.
 */
export function ReviewVoteButton({
  reviewId,
  comboId,
  initialVoted,
  initialVoteCount,
  isSignedIn,
  tone = 'light',
}: ReviewVoteButtonProps) {
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<ReviewVoteState, boolean>(
    { voted: initialVoted, voteCount: initialVoteCount },
    (current, nextVoted) => {
      if (current.voted === nextVoted) return current;
      return {
        voted: nextVoted,
        voteCount: Math.max(0, current.voteCount + (nextVoted ? 1 : -1)),
      };
    }
  );

  const handleClick = () => {
    setError(null);

    if (!isSignedIn) {
      openAuthModal({ type: 'reviewVote', reviewId, comboId });
      return;
    }

    const nextVoted = !optimistic.voted;
    startTransition(async () => {
      setOptimistic(nextVoted);
      const result = await toggleReviewVote(reviewId);
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  };

  const baseClass =
    'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70';
  const lightClass = optimistic.voted
    ? 'bg-action text-white focus-visible:ring-action'
    : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-500 focus-visible:ring-action';
  const darkClass = optimistic.voted
    ? 'bg-white text-action focus-visible:ring-white'
    : 'border border-white/20 bg-white/10 text-gray-200 hover:bg-white/15 focus-visible:ring-white';

  return (
    <div>
      <button
        type="button"
        aria-pressed={optimistic.voted}
        disabled={isPending}
        onClick={handleClick}
        className={[baseClass, tone === 'dark' ? darkClass : lightClass].join(' ')}
      >
        <span aria-hidden="true">👍</span>
        <span>{optimistic.voted ? '도움됨' : '도움돼요'}</span>
        <span>{optimistic.voteCount}</span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-exclude">
          {error}
        </p>
      ) : null}
    </div>
  );
}
