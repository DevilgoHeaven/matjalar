import type { ReviewView } from '@/app/combo/[id]/data';
import { ReportButton } from './ReportButton';
import { ReviewVoteButton } from './ReviewVoteButton';

interface ReviewListProps {
  reviews: ReviewView[];
  featuredReviewId?: string;
  comboId: string;
  isSignedIn: boolean;
}

export function ReviewList({
  reviews,
  featuredReviewId,
  comboId,
  isSignedIn,
}: ReviewListProps) {
  const visibleReviews = featuredReviewId
    ? reviews.filter((review) => review.id !== featuredReviewId)
    : reviews;

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold text-action">한 줄 후기</h2>
        <span className="text-xs text-gray-500">{reviews.length}개</span>
      </div>

      {visibleReviews.length ? (
        <ul className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {visibleReviews.map((review) => (
            <li key={review.id} className="p-4">
              <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                <div>
                  <span>{review.author.nickname}</span>
                  <span className="ml-2">별점 {review.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ReviewVoteButton
                    reviewId={review.id}
                    comboId={comboId}
                    initialVoted={review.viewerHasVoted}
                    initialVoteCount={review.voteCount}
                    isSignedIn={isSignedIn}
                  />
                  <ReportButton
                    targetType="review"
                    targetId={review.id}
                    isSignedIn={isSignedIn}
                  />
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-action">
                {review.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
          아직 추가 후기가 없습니다.
        </p>
      )}
    </section>
  );
}
