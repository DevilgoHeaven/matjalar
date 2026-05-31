import Link from 'next/link';
import { PageEvents } from '@/components/analytics/PageEvents';
import { ComboCard } from '@/components/combo/ComboCard';
import {
  RANKING_DEFINITIONS,
  type RankingKind,
  type RankingPageData,
} from './data';

interface RankingsViewProps {
  data: RankingPageData;
  pathname: string;
}

export function RankingsView({ data, pathname }: RankingsViewProps) {
  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <PageEvents
        events={[
          { type: 'page_view', pathname },
          {
            type: 'ranking_view',
            ranking_kind: data.kind,
            count: data.combos.length,
          },
        ]}
      />

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-bold text-stone-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            맛잘알
          </Link>
          <h1 className="mt-4 break-keep text-3xl font-black leading-tight text-action">
            {data.definition.title}
          </h1>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-stone-600">
            {data.definition.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(RANKING_DEFINITIONS) as RankingKind[]).map((kind) => {
              const active = kind === data.kind;
              return (
                <Link
                  key={kind}
                  href={`/rankings/${kind}`}
                  className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-action text-white'
                      : 'border border-stone-300 bg-white text-action hover:border-stone-500'
                  }`}
                >
                  {RANKING_DEFINITIONS[kind].label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-3xl gap-3 px-5 py-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-black tracking-widest text-stone-500">
            {data.combos.length}개 조합
          </h2>
          <Link
            href="/quiz"
            className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-3 text-xs font-black text-action hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            취향 퀴즈
          </Link>
        </div>

        {data.combos.length ? (
          data.combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} brand={combo.brand} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
            <p className="break-keep text-base font-black text-action">
              이 랭킹에 맞는 조합이 아직 없어요.
            </p>
            <p className="mt-2 break-keep text-sm font-semibold text-stone-500">
              운영자 검증 조합이 추가되면 바로 채워집니다.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
