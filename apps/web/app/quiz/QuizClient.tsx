'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { buildComboPersonality, buildTrackedSharePath } from '@mzr/db';
import type { PublicCombo } from '@/lib/combo/public-combos';
import { trackEvent } from '@/lib/analytics/events';
import { ComboVisual } from '@/components/combo/ComboVisual';
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
    const basePath = `/quiz?prefs=${encodeURIComponent(selectedIds.join(','))}`;
    const clipboardPath = buildTrackedSharePath({
      path: basePath,
      surface: 'quiz_result',
      channel: 'clipboard',
      content: selectedIds.join('-'),
    });
    const clipboardUrl =
      typeof window === 'undefined'
        ? clipboardPath
        : `${window.location.origin}${clipboardPath}`;
    const labels = QUIZ_PREFERENCES.filter((item) => selected.has(item.id))
      .map((item) => item.label)
      .join(', ');
    const personality = comboPersonality(primary);
    const buildText = (shareUrl: string) =>
      `내 맛잘알 결과: ${labels}\n${personality.shareText}\n추천은 ${primary.title}\n${shareUrl}`;
    const clipboardText = buildText(clipboardUrl);

    try {
      let channel: 'native' | 'clipboard' | 'fallback' = 'fallback';
      if (typeof navigator !== 'undefined' && navigator.share) {
        const nativePath = buildTrackedSharePath({
          path: basePath,
          surface: 'quiz_result',
          channel: 'native',
          content: selectedIds.join('-'),
        });
        const nativeUrl =
          typeof window === 'undefined'
            ? nativePath
            : `${window.location.origin}${nativePath}`;
        await navigator.share({
          title: '맛잘알 취향 결과',
          text: buildText(nativeUrl),
          url: nativeUrl,
        });
        setMessage('공유창을 열었어요.');
        channel = 'native';
      } else {
        const copied = await copyText(clipboardText);
        setMessage(copied ? '결과를 복사했어요.' : clipboardText);
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
        share_url_path: buildTrackedSharePath({
          path: basePath,
          surface: 'quiz_result',
          channel,
          content: selectedIds.join('-'),
        }),
      });
    } catch {
      const copied = await copyText(clipboardText);
      setMessage(copied ? '결과를 복사했어요.' : clipboardText);
      void trackEvent({
        type: 'share_click',
        target_type: 'quiz_result',
        target_id: selectedIds.join(','),
        channel: copied ? 'clipboard' : 'fallback',
        share_url_path: buildTrackedSharePath({
          path: basePath,
          surface: 'quiz_result',
          channel: copied ? 'clipboard' : 'fallback',
          content: selectedIds.join('-'),
        }),
      });
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-widest text-stone-500">
              TASTE PICKER
            </p>
            <h2 className="mt-1 text-lg font-black text-action">오늘의 기준</h2>
          </div>
          <p className="break-keep text-xs font-bold text-stone-500">
            여러 개 골라도 됩니다
          </p>
        </div>
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
          <div>
            <p className="text-xs font-black tracking-widest text-stone-500">
              SHARE RESULT
            </p>
            <h2 className="mt-1 text-lg font-black text-action">친구에게 보낼 추천</h2>
          </div>
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
          results.map((combo, index) => {
            const personality = comboPersonality(combo);
            return (
              <Link
                key={combo.id}
                href={`/combo/${combo.id}`}
                className="group overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-stone-500 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                <div className="grid sm:grid-cols-[156px_1fr]">
                  <ComboVisual
                    personality={personality}
                    title={combo.title}
                    className="aspect-[16/10] rounded-none sm:aspect-auto sm:h-full sm:w-full"
                  />
                  <div className="p-4">
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
                    <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-stone-700">
                      {personality.shareText}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
                        {personality.badgeLabel}
                      </span>
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
                    <p className="mt-4 text-xs font-black text-action underline-offset-4 group-hover:underline">
                      주문문 보기
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
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

function comboPersonality(combo: PublicCombo) {
  return buildComboPersonality({
    title: combo.title,
    cardSummary: combo.cardSummary,
    estimatedPrice: combo.estimatedPrice,
    priceStatus: combo.priceStatus,
    tagLabels: combo.tags.map((tag) => tag.label),
    tagSlugs: combo.tagSlugs,
  });
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
