'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CATEGORY_TOKENS, type CategoryKey } from '@mzr/ui';
import type { HomeCategory } from '@/app/data';

export function CategoryTile({ category }: { category: HomeCategory }) {
  const [message, setMessage] = useState<string | null>(null);
  const token = CATEGORY_TOKENS[category.id as CategoryKey];
  const gradient = token?.gradient ?? (['#F5F5F5', '#E5E5E5'] as const);

  const tileInner = (
    <span
      className="flex aspect-square min-h-20 flex-col items-center justify-center rounded-xl p-2 text-center transition"
      style={{
        background: category.isActive
          ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
          : '#F5F5F5',
        opacity: category.isActive ? 1 : 0.62,
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {category.emoji}
      </span>
      <span className="mt-1 text-[11px] font-bold leading-tight text-action">
        {category.label}
      </span>
      {!category.isActive && (
        <span className="mt-1 rounded-full bg-stone-200 px-1.5 py-0.5 text-[9px] font-semibold text-stone-600">
          준비중
        </span>
      )}
    </span>
  );

  if (category.isActive && category.primaryBrandSlug) {
    return (
      <Link
        href={`/brand/${category.primaryBrandSlug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        prefetch={false}
      >
        {tileInner}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${category.label} 준비중`}
        aria-describedby={message ? `category-${category.id}-message` : undefined}
        onClick={() => {
          setMessage(`${category.label} 조합은 곧 만나요.`);
          window.setTimeout(() => setMessage(null), 2200);
        }}
        className="block w-full cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        {tileInner}
      </button>
      {message ? (
        <p
          id={`category-${category.id}-message`}
          role="status"
          className="absolute left-1/2 top-full z-10 mt-2 w-max max-w-[11rem] -translate-x-1/2 rounded-full bg-action px-3 py-2 text-center text-[11px] font-bold text-white shadow-lg"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
