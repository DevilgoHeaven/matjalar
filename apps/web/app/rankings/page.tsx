import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RankingsView } from './RankingsView';
import { getRankingPageData, isRankingKind } from './data';

export const metadata: Metadata = {
  title: '랭킹 - 맛잘알',
  description: '만원컷, 초보추천, 다이어트, 매운맛 조합을 바로 고르세요.',
};

interface RankingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const resolved = await searchParams;
  const kindParam = getFirstParam(resolved?.kind);
  if (isRankingKind(kindParam)) {
    redirect(`/rankings/${kindParam}`);
  }

  const data = await getRankingPageData(kindParam);

  return <RankingsView data={data} pathname="/rankings" />;
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}
