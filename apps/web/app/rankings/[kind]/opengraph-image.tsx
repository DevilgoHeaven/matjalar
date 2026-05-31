import { ImageResponse } from 'next/og';
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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #FFF7ED, #FAFAFA 58%, #DCFCE7)',
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
            {data.combos.length}개 조합 바로 고르기
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
              <div
                key={combo.id}
                style={{
                  flex: 1,
                  border: '2px solid #E7E5E4',
                  borderRadius: 18,
                  background: '#FFFFFF',
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 900, color: '#78716C' }}>
                  {index + 1} · {combo.brand.name}
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
              </div>
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
