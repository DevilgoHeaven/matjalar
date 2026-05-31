import { ImageResponse } from 'next/og';
import { buildComboPersonality } from '@mzr/db';
import {
  buildOrderScript,
  buildOrderSummary,
} from '@/lib/combo/order-script';
import { getComboDetail } from './data';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

interface ComboImageProps {
  params: Promise<{ id: string }>;
}

export default async function ComboImage({ params }: ComboImageProps) {
  const { id } = await params;
  const combo = await getComboDetail(id);

  if (!combo) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#FAFAFA',
            color: '#111111',
            padding: 80,
          }}
        >
          <div style={{ fontSize: 44, fontWeight: 900 }}>맛잘알</div>
          <div style={{ marginTop: 18, fontSize: 72, fontWeight: 900 }}>
            조합을 찾을 수 없어요
          </div>
        </div>
      ),
      size
    );
  }

  const orderInput = {
    brandName: combo.brand.name,
    menuName: combo.menu.name,
    variantName: combo.menu.variantName,
    options: combo.options,
  };
  const orderText = buildOrderScript(orderInput);
  const orderSummary = buildOrderSummary(orderInput);
  const brandLine = `${combo.brand.name} · ${orderSummary}`;
  const orderLine = `${brandLine} · ${orderText.replace(/\n/g, ' ')}`;
  const voteLine = `따봉 ${combo.stats.voteCount}`;
  const reviewLine = `후기 ${combo.stats.reviewCount}`;
  const ratingLine = `별점 ${combo.stats.averageRating.toFixed(1)}`;
  const personality = buildComboPersonality({
    title: combo.title,
    cardSummary: combo.cardSummary,
    estimatedPrice: combo.estimatedPrice,
    priceStatus: combo.priceStatus,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: backgroundForMood(personality.mood),
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
            {formatPrice(combo.estimatedPrice, combo.priceStatus)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#6B7280' }}>
            {personality.situation}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.08,
              maxWidth: 960,
            }}
          >
            {combo.title}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.35,
              maxWidth: 950,
              color: '#374151',
            }}
          >
            {personality.shareText}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.35,
              maxWidth: 950,
              color: '#57534E',
            }}
          >
            {orderLine}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, fontSize: 26, fontWeight: 900 }}>
          <div>{voteLine}</div>
          <div>{reviewLine}</div>
          <div>{ratingLine}</div>
        </div>
      </div>
    ),
    size
  );
}

function formatPrice(value: number, status: string) {
  if (status === 'unknown') return '가격 확인중';
  const price = `${new Intl.NumberFormat('ko-KR').format(value)}원`;
  return status === 'exact' ? price : `약 ${price}`;
}

function backgroundForMood(mood: string) {
  if (mood === 'spicy') return 'linear-gradient(135deg, #FEE2E2, #FAFAFA 55%, #FED7AA)';
  if (mood === 'light') return 'linear-gradient(135deg, #DCFCE7, #FAFAFA 55%, #ECFCCB)';
  if (mood === 'budget') return 'linear-gradient(135deg, #D1FAE5, #FAFAFA 55%, #FEF3C7)';
  if (mood === 'hearty') return 'linear-gradient(135deg, #FFEDD5, #FAFAFA 55%, #E7E5E4)';
  if (mood === 'sweet') return 'linear-gradient(135deg, #FCE7F3, #FAFAFA 55%, #FFE4E6)';
  return 'linear-gradient(135deg, #FFE5D9, #FAFAFA 55%, #E0F4E0)';
}
