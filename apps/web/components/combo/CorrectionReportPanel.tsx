'use client';

import { useState } from 'react';

type ReportKind = 'price' | 'sold_out' | 'option_changed' | 'combo_feedback';

interface CorrectionReportPanelProps {
  targetType: 'combo' | 'brand' | 'menu';
  targetId: string;
}

const REPORT_KINDS: Array<{
  id: ReportKind;
  label: string;
  description: string;
}> = [
  {
    id: 'price',
    label: '가격',
    description: '가격이 다르거나 할인 조건이 있어요.',
  },
  {
    id: 'sold_out',
    label: '품절',
    description: '매장이나 앱에서 지금 선택할 수 없어요.',
  },
  {
    id: 'option_changed',
    label: '옵션',
    description: '토핑, 사이즈, 조리 방식이 바뀌었어요.',
  },
  {
    id: 'combo_feedback',
    label: '조합',
    description: '맛이나 주문 난이도에 보완점이 있어요.',
  },
];

export function CorrectionReportPanel({
  targetType,
  targetId,
}: CorrectionReportPanelProps) {
  const [reportKind, setReportKind] = useState<ReportKind>('price');
  const [note, setNote] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const normalizedNote = note.normalize('NFC').trim();
  const normalizedUrl = sourceUrl.trim();

  async function submitCorrection() {
    setIsBusy(true);
    setMessage('');

    try {
      const response = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          report_kind: reportKind,
          note: normalizedNote || undefined,
          source_url: normalizedUrl || undefined,
        }),
      });

      if (!response.ok) {
        setMessage(messageForStatus(response.status));
        return;
      }

      setNote('');
      setSourceUrl('');
      setMessage('제보가 접수되었습니다. 운영자가 확인한 뒤 반영합니다.');
    } catch {
      setMessage('제보 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-action">가격·옵션 제보</h2>
          <p className="mt-1 break-keep text-sm font-semibold leading-relaxed text-stone-600">
            다른 매장 가격, 품절, 옵션 변경을 익명으로 알려주세요.
          </p>
        </div>
        <span className="mt-2 w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200 sm:mt-0">
          검토 후 반영
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {REPORT_KINDS.map((item) => {
          const active = reportKind === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setReportKind(item.id)}
              className={`min-h-16 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${
                active
                  ? 'border-action bg-action text-white'
                  : 'border-stone-200 bg-white text-action hover:border-stone-500'
              }`}
            >
              <span className="block text-sm font-black">{item.label}</span>
              <span
                className={`mt-1 block break-keep text-xs font-semibold leading-relaxed ${
                  active ? 'text-white/75' : 'text-stone-500'
                }`}
              >
                {item.description}
              </span>
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-black text-stone-500">메모</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          placeholder="예: 앱에서는 500원 더 비싸요"
          className="mt-1 min-h-24 w-full resize-none rounded-lg border border-stone-300 bg-white p-3 text-sm font-semibold text-action outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-black text-stone-500">출처 링크</span>
        <input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          inputMode="url"
          placeholder="https://"
          className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-action outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
        />
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 break-keep text-xs font-bold text-stone-500" aria-live="polite">
          {message}
        </p>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void submitCorrection()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-sm font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-60"
        >
          제보 접수
        </button>
      </div>
    </section>
  );
}

function messageForStatus(status: number) {
  if (status === 429) {
    return '오늘 제보 한도를 넘었습니다. 내일 다시 보내 주세요.';
  }
  if (status === 404) {
    return '제보할 공개 대상을 찾지 못했습니다.';
  }
  if (status === 400) {
    return '입력값을 확인해 주세요. 링크는 http 또는 https 주소만 가능합니다.';
  }
  return '제보 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}
