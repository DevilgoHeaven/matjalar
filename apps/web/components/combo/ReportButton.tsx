'use client';

import { useState, useTransition } from 'react';
import { submitReport } from '@/app/actions/reports';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
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
  const { openAuthModal } = useAuthModal();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    tone === 'dark'
      ? 'text-gray-300 hover:text-white'
      : 'text-gray-500 hover:text-action';

  const normalizedReason = reason.normalize('NFC').trim();
  const canSubmit = normalizedReason.length >= 4;

  const submit = () => {
    if (!canSubmit) {
      setMessage('신고 사유를 조금 더 구체적으로 입력해 주세요.');
      return;
    }

    if (!isSignedIn) {
      openAuthModal({
        type: 'reportSubmit',
        targetType,
        targetId,
        reason: normalizedReason,
      });
      setIsOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await submitReport({ targetType, targetId, reason: normalizedReason });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setReason('');
      setIsOpen(false);
      setMessage('신고가 접수되었습니다.');
      void trackEvent({
        type: 'report_submit',
        target_type: targetType,
        target_id: targetId,
      });
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
        className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${buttonClass}`}
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
          ) : (
            <p className="mt-2 text-xs font-semibold text-gray-500">
              4자 이상 입력해 주세요.
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-11 rounded-md px-3 text-xs font-bold text-gray-500 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending || !canSubmit}
              className="min-h-11 rounded-md bg-action px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
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
