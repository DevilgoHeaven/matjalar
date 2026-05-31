import { ImageResponse } from 'next/og';
import { buildComboPersonality } from '@mzr/db';
import {
  getRankingPageData,
  isRankingKind,
  RANKING_DEFINITIONS,
} from '../data';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

interface RankingImageProps {
  params: Promise<{ kind: string }>;
}

export default async function RankingImage({ params }: RankingImageProps) {
  const { kind } = await params;
  const rankingKind = isRankingKind(kind) ? kind : 'hot';
  const data = await getRankingPageData(rankingKind);
  const topCombos = data.combos.slice(0, 3);
  const comboCountLine = `${data.combos.length}개 조합 바로 고르기`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: backgroundForRanking(rankingKind),
          color: '#111111',
          padding: 72,
          fontFamily: 'Arial',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 34, fontWeight: 900 }}>맛잘알</div>
          <div
            style={{
              border: '2px solid #111111',
              borderRadius: 999,
              padding: '12px 22px',
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            {RANKING_DEFINITIONS[rankingKind].label}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#6B7280' }}>
            {comboCountLine}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {data.definition.title}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.35,
              maxWidth: 920,
              color: '#374151',
            }}
          >
            {data.definition.description}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {topCombos.length ? (
            topCombos.map((combo, index) => (
              <TopComboCard key={combo.id} combo={combo} index={index} />
            ))
          ) : (
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              운영자 검증 조합이 추가되면 랭킹이 채워집니다
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}

function TopComboCard({
  combo,
  index,
}: {
  combo: Awaited<ReturnType<typeof getRankingPageData>>['combos'][number];
  index: number;
}) {
  const personality = buildComboPersonality({
    title: combo.title,
    cardSummary: combo.cardSummary,
    estimatedPrice: combo.estimatedPrice,
    priceStatus: combo.priceStatus,
    tagLabels: combo.tags.map((tag) => tag.label),
    tagSlugs: combo.tagSlugs,
  });
  const rankLine = `${index + 1} · ${combo.brand.name} · ${personality.badgeLabel}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        border: '2px solid #E7E5E4',
        borderRadius: 18,
        background: '#FFFFFF',
        padding: 20,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 900, color: '#78716C' }}>
        {rankLine}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1.15,
        }}
      >
        {combo.title}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 19,
          fontWeight: 700,
          lineHeight: 1.25,
          color: '#57534E',
        }}
      >
        {personality.shareText}
      </div>
    </div>
  );
}

function backgroundForRanking(kind: string) {
  if (kind === 'spicy') return 'linear-gradient(135deg, #FEE2E2, #FAFAFA 58%, #FED7AA)';
  if (kind === 'diet') return 'linear-gradient(135deg, #DCFCE7, #FAFAFA 58%, #ECFCCB)';
  if (kind === 'budget') return 'linear-gradient(135deg, #D1FAE5, #FAFAFA 58%, #FEF3C7)';
  if (kind === 'hearty') return 'linear-gradient(135deg, #FFEDD5, #FAFAFA 58%, #E7E5E4)';
  return 'linear-gradient(135deg, #FFF7ED, #FAFAFA 58%, #DCFCE7)';
}
