'use client';

import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  checkSimilarCombos,
  registerCombo,
  type SimilarCombo,
} from '@/app/actions/combos';

interface DuplicateAwareComboFormProps {
  children: ReactNode;
  className?: string;
}

/**
 * 조합 등록 직전에 combo_signature 기반 유사 조합을 확인한다.
 *
 * PRD §7 중복 방지 정책은 UNIQUE 제약이 아니라 경고 후 계속 등록이다.
 * 서버에서 같은 정규화/서명 계산을 재사용하고, 사용자가 확인한 경우에만
 * allowDuplicate 플래그를 붙여 실제 등록 Server Action 으로 넘긴다.
 */
export function DuplicateAwareComboForm({
  children,
  className,
}: DuplicateAwareComboFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const allowDuplicateRef = useRef<HTMLInputElement>(null);
  const bypassCheckRef = useRef(false);
  const isCheckingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [similarCombos, setSimilarCombos] = useState<SimilarCombo[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (bypassCheckRef.current) {
      bypassCheckRef.current = false;
      isSubmittingRef.current = true;
      return;
    }

    event.preventDefault();
    if (isCheckingRef.current || isSubmittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    isCheckingRef.current = true;

    startTransition(async () => {
      try {
        setError(null);
        setSimilarCombos([]);
        const result = await checkSimilarCombos(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }

        if (result.combos.length > 0) {
          setSimilarCombos(result.combos);
          return;
        }

        submitWithoutDuplicateCheck(false);
      } finally {
        isCheckingRef.current = false;
      }
    });
  }

  function submitWithoutDuplicateCheck(allowDuplicate: boolean) {
    if (allowDuplicateRef.current) {
      allowDuplicateRef.current.value = allowDuplicate ? '1' : '0';
    }
    bypassCheckRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={registerCombo}
      className={className}
      onSubmit={handleSubmit}
    >
      <input ref={allowDuplicateRef} type="hidden" name="allowDuplicate" value="0" />

      {error ? (
        <p
          role="alert"
          className="col-span-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      ) : null}

      {similarCombos.length > 0 ? (
        <section className="col-span-full rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">
            이미 비슷한 조합이 있어요
          </p>
          <ul className="mt-3 grid gap-2">
            {similarCombos.map((combo) => (
              <li
                key={combo.id}
                className="flex items-center justify-between gap-3 rounded-md bg-white/80 px-3 py-2 text-sm"
              >
                <span className="min-w-0 font-bold text-action">{combo.title}</span>
                <span className="shrink-0 text-xs font-semibold text-amber-800">
                  따봉 {combo.voteCount}
                  {combo.status === 'pending' ? ' · 승인 대기' : ''}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-action px-4 text-sm font-black text-white transition hover:bg-gray-800 disabled:opacity-60"
              disabled={isPending || isSubmittingRef.current}
              onClick={() => submitWithoutDuplicateCheck(true)}
            >
              그래도 등록
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-300 bg-white px-4 text-sm font-black text-amber-900 transition hover:border-amber-500 disabled:opacity-60"
              disabled={isPending || isSubmittingRef.current}
              onClick={() => setSimilarCombos([])}
            >
              다시 고치기
            </button>
          </div>
        </section>
      ) : null}

      {children}
    </form>
  );
}
