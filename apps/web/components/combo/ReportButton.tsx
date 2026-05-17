'use client';

import { useState, useTransition } from 'react';
import { submitReport } from '@/app/actions/reports';
import { trackEvent } from '@/lib/analytics/events';

interface ReportButtonProps {
  targetType: 'combo' | 'review';
  targetId: string;
  isSignedIn: boolean;
  tone?: 'light' | 'dark';
}

export function ReportButton({
  targetType,
  targetId,
  isSignedIn,
  tone = 'light',
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    tone === 'dark'
      ? 'text-gray-300 hover:text-white'
      : 'text-gray-500 hover:text-action';

  const submit = () => {
    if (!isSignedIn) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    startTransition(async () => {
      const result = await submitReport({ targetType, targetId, reason });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setReason('');
      setIsOpen(false);
      setMessage('신고가 접수되었습니다.');
      void trackEvent({ type: 'report_submit', target_type: targetType, target_id: targetId });
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setIsOpen((value) => !value);
        }}
        className={`text-xs font-bold underline-offset-4 hover:underline ${buttonClass}`}
      >
        신고
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 text-action shadow-xl">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder="문제 내용을 입력해 주세요"
            className="min-h-24 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-action focus:ring-2 focus:ring-action/10"
          />
          {message ? (
            <p className="mt-2 text-xs font-semibold text-gray-500">{message}</p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-8 rounded-md px-3 text-xs font-bold text-gray-500 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="h-8 rounded-md bg-action px-3 text-xs font-black text-white disabled:opacity-50"
            >
              접수
            </button>
          </div>
        </div>
      ) : null}

      {!isOpen && message ? (
        <p className="absolute right-0 z-10 mt-2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white">
          {message}
        </p>
      ) : null}
    </div>
  );
}

