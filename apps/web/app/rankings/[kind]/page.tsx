import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RankingsView } from '../RankingsView';
import {
  getRankingPageData,
  isRankingKind,
  RANKING_DEFINITIONS,
} from '../data';

interface RankingKindPageProps {
  params: Promise<{ kind: string }>;
}

export async function generateMetadata({
  params,
}: RankingKindPageProps): Promise<Metadata> {
  const { kind } = await params;
  if (!isRankingKind(kind)) {
    return {
      title: '랭킹 - 맛잘알',
    };
  }

  const definition = RANKING_DEFINITIONS[kind];
  return {
    title: `${definition.label} 랭킹 - 맛잘알`,
    description: definition.description,
    openGraph: {
      title: `${definition.label} 랭킹 - 맛잘알`,
      description: definition.description,
      type: 'website',
    },
  };
}

export default async function RankingKindPage({ params }: RankingKindPageProps) {
  const { kind } = await params;
  if (!isRankingKind(kind)) notFound();

  const data = await getRankingPageData(kind);
  return <RankingsView data={data} pathname={`/rankings/${data.kind}`} />;
}
