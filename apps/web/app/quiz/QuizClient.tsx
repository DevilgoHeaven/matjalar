'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PublicCombo } from '@/lib/combo/public-combos';
import { trackEvent } from '@/lib/analytics/events';
import { QUIZ_PREFERENCES, type QuizPreference } from './preferences';

interface QuizClientProps {
  combos: PublicCombo[];
  initialPreferences?: QuizPreference[];
}

export function QuizClient({ combos, initialPreferences }: QuizClientProps) {
  const [selected, setSelected] = useState<Set<QuizPreference>>(
    () => new Set(initialPreferences?.length ? initialPreferences : ['beginner'])
  );
  const [message, setMessage] = useState('');

  const results = useMemo(
    () => rankQuizCombos(combos, selected).slice(0, 3),
    [combos, selected]
  );
  const primary = results[0];

  function togglePreference(preference: QuizPreference) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(preference)) {
        next.delete(preference);
      } else {
        next.add(preference);
      }
      return next.size ? next : new Set(['beginner']);
    });
  }

  async function shareResult() {
    if (!primary) return;
    const selectedIds = [...selected].sort();
    const path = `/quiz?prefs=${encodeURIComponent(selectedIds.join(','))}`;
    const url =
      typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
    const labels = QUIZ_PREFERENCES.filter((item) => selected.has(item.id))
      .map((item) => item.label)
      .join(', ');
    const text = `내 맛잘알 결과: ${labels}\n추천은 ${primary.title}\n${url}`;

    try {
      let channel: 'native' | 'clipboard' | 'fallback' = 'fallback';
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: '맛잘알 취향 결과',
          text,
          url,
        });
        setMessage('공유창을 열었어요.');
        channel = 'native';
      } else {
        const copied = await copyText(text);
        setMessage(copied ? '결과를 복사했어요.' : text);
        channel = copied ? 'clipboard' : 'fallback';
      }
      void trackEvent({
        type: 'quiz_result_share',
        result_kind: selectedIds.join(','),
        combo_id: primary.id,
      });
      void trackEvent({
        type: 'share_click',
        target_type: 'quiz_result',
        target_id: selectedIds.join(','),
        channel,
      });
    } catch {
      const copied = await copyText(text);
      setMessage(copied ? '결과를 복사했어요.' : text);
      void trackEvent({
        type: 'share_click',
        target_type: 'quiz_result',
        target_id: selectedIds.join(','),
        channel: copied ? 'clipboard' : 'fallback',
      });
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-base font-black text-action">오늘의 기준</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {QUIZ_PREFERENCES.map((preference) => {
            const active = selected.has(preference.id);
            return (
              <button
                key={preference.id}
                type="button"
                aria-pressed={active}
                onClick={() => togglePreference(preference.id)}
                className={`min-h-16 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${
                  active
                    ? 'border-action bg-action text-white'
                    : 'border-stone-200 bg-white text-action hover:border-stone-500'
                }`}
              >
                <span className="block text-sm font-black">
                  {preference.label}
                </span>
                <span
                  className={`mt-1 block break-keep text-xs font-semibold leading-relaxed ${
                    active ? 'text-white/75' : 'text-stone-500'
                  }`}
                >
                  {preference.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-black tracking-widest text-stone-500">
            추천 결과
          </h2>
          <button
            type="button"
            disabled={!primary}
            onClick={() => void shareResult()}
            className="inline-flex min-h-11 items-center rounded-full bg-action px-3 text-xs font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-60"
          >
            결과 공유
          </button>
        </div>

        {results.length ? (
          results.map((combo, index) => (
            <Link
              key={combo.id}
              href={`/combo/${combo.id}`}
              className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black tracking-widest text-stone-500">
                    추천 {index + 1} · {combo.brand.name}
                  </p>
                  <h3 className="mt-1 text-base font-black leading-snug text-action">
                    {combo.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-stone-600">
                    {combo.cardSummary}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-black text-action">
                  {formatPrice(combo.estimatedPrice, combo.priceStatus)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {combo.tags.map((tag) => (
                  <span
                    key={tag.label}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600"
                  >
                    {tag.emoji ? `${tag.emoji} ` : ''}
                    {tag.label}
                  </span>
                ))}
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
            <p className="break-keep text-base font-black text-action">
              아직 맞는 조합이 부족해요.
            </p>
            <p className="mt-2 break-keep text-sm font-semibold text-stone-500">
              기준을 하나 줄이면 더 넓게 찾아볼 수 있어요.
            </p>
          </div>
        )}

        <p className="min-h-5 break-keep text-xs font-bold text-stone-500" aria-live="polite">
          {message}
        </p>
      </section>
    </div>
  );
}

function rankQuizCombos(combos: PublicCombo[], selected: Set<QuizPreference>) {
  const preferences = QUIZ_PREFERENCES.filter((item) => selected.has(item.id));
  return [...combos].sort((a, b) => scoreCombo(b, preferences) - scoreCombo(a, preferences));
}

function scoreCombo(
  combo: PublicCombo,
  preferences: typeof QUIZ_PREFERENCES
): number {
  let score = combo.stats.hotScore + combo.stats.voteCount * 0.8 + combo.bookmarkCount;
  for (const preference of preferences) {
    if (preference.tagSlug && combo.tagSlugs.includes(preference.tagSlug)) {
      score += 100;
    }
    if (preference.id === 'budget' && combo.estimatedPrice <= 10000) {
      score += 80;
    }
  }
  if (combo.priceStatus === 'unknown') score -= 20;
  return score;
}

function formatPrice(value: number, status: string) {
  if (status === 'unknown') return '가격 확인중';
  const price = `${new Intl.NumberFormat('ko-KR').format(value)}원`;
  return status === 'exact' ? price : `약 ${price}`;
}

async function copyText(value: string): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    !window.isSecureContext
  ) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
