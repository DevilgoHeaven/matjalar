'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitReview } from '@/app/actions/reviews';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { trackEvent } from '@/lib/analytics/events';

interface ReviewFormProps {
  comboId: string;
  isSignedIn: boolean;
  initialReview: {
    rating: number;
    content: string;
  } | null;
}

export function ReviewForm({
  comboId,
  isSignedIn,
  initialReview,
}: ReviewFormProps) {
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const [rating, setRating] = useState(initialReview?.rating ?? 5);
  const [content, setContent] = useState(initialReview?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedContent = content.normalize('NFC').trim();
  const isDisabled = isPending || normalizedContent.length === 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isSignedIn) {
      openAuthModal({
        type: 'reviewSubmit',
        comboId,
        rating,
        content: normalizedContent,
      });
      return;
    }

    startTransition(async () => {
      void trackEvent({ type: 'review_submit', combo_id: comboId, rating });
      const result = await submitReview({
        comboId,
        rating,
        content: normalizedContent,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-action">
          {initialReview ? '내 후기 수정' : '한 줄 후기 남기기'}
        </h2>
        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
          별점
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm font-bold text-action outline-none focus:border-action focus:ring-2 focus:ring-action/10"
          >
            {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map((value) => (
              <option key={value} value={value}>
                {value.toFixed(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="mt-3">
        <label className="block">
          <span className="sr-only">후기 내용</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 140))}
            maxLength={140}
            placeholder="먹어본 느낌을 140자 안에서 남겨 주세요"
            className="min-h-24 w-full resize-y rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm leading-6 text-action outline-none transition focus:border-action focus:bg-white focus:ring-2 focus:ring-action/10"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-gray-500">
            {normalizedContent.length}/140
          </p>
          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex h-10 items-center justify-center rounded-md bg-action px-4 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? '저장 중' : initialReview ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-exclude">
          {error}
        </p>
      ) : null}
    </section>
  );
}
