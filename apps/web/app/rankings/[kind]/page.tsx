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
  const title = `${definition.label} 랭킹 - 맛잘알`;
  return {
    title,
    description: definition.description,
    alternates: {
      canonical: `/rankings/${kind}`,
    },
    openGraph: {
      title,
      description: definition.description,
      url: `/rankings/${kind}`,
      type: 'website',
      images: [
        {
          url: `/rankings/${kind}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${definition.label} 랭킹 맛잘알 공유 이미지`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: definition.description,
      images: [`/rankings/${kind}/opengraph-image`],
    },
  };
}

export default async function RankingKindPage({ params }: RankingKindPageProps) {
  const { kind } = await params;
  if (!isRankingKind(kind)) notFound();

  const data = await getRankingPageData(kind);
  return <RankingsView data={data} pathname={`/rankings/${data.kind}`} />;
}
