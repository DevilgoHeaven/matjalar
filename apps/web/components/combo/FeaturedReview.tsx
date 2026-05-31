import type { ReviewView } from '@/app/combo/[id]/data';
import { ReportButton } from './ReportButton';
import { ReviewVoteButton } from './ReviewVoteButton';

interface FeaturedReviewProps {
  review: ReviewView | null;
  seedComment: string | null;
  comboId: string;
  isSignedIn: boolean;
}

export function FeaturedReview({
  review,
  seedComment,
  comboId,
  isSignedIn,
}: FeaturedReviewProps) {
  if (review) {
    return (
      <section className="rounded-lg bg-gray-950 p-5 text-white">
        <p className="text-xs font-semibold text-gray-400">대표 후기</p>
        <blockquote className="mt-3 text-lg font-semibold leading-relaxed">
          “{review.content}”
        </blockquote>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-300">
          <div>
            <span>{review.author.nickname}</span>
            <span className="ml-2">별점 {review.rating.toFixed(1)}</span>
          </div>
          <ReviewVoteButton
            reviewId={review.id}
            comboId={comboId}
            initialVoted={review.viewerHasVoted}
            initialVoteCount={review.voteCount}
            isSignedIn={isSignedIn}
            tone="dark"
          />
          <ReportButton
            targetType="review"
            targetId={review.id}
            isSignedIn={isSignedIn}
            tone="dark"
          />
        </div>
      </section>
    );
  }

  if (seedComment) {
    return (
      <section className="rounded-lg border border-gray-200 bg-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-500">운영자 추천 메모</p>
        <p className="mt-3 text-base font-medium leading-relaxed text-action">
          {seedComment}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-dashed border-gray-300 bg-white p-5">
      <p className="text-sm font-semibold text-action">첫 후기를 기다리는 중</p>
      <p className="mt-1 text-sm text-gray-500">
        이 조합을 먹어봤다면 한 줄로 남길 수 있게 곧 열어둘게요.
      </p>
    </section>
  );
}
