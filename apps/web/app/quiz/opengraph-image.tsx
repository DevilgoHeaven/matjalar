import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function QuizOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #F4FAF5, #FAFAFA 55%, #FEE2E2)',
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
            취향 결과 공유
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#57534E' }}>
            가격 · 매운맛 · 든든함을 고르면
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 82,
              fontWeight: 900,
              lineHeight: 1.04,
              maxWidth: 980,
            }}
          >
            친구에게 보낼 추천 카드 완성
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.35,
              maxWidth: 900,
              color: '#374151',
            }}
          >
            오늘 기준을 고르고, 주문문까지 이어지는 조합을 바로 공유하세요.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 26, fontWeight: 900 }}>
          <div>가격 먼저</div>
          <div>실패 방지</div>
          <div>매운맛</div>
          <div>든든함</div>
        </div>
      </div>
    ),
    size
  );
}
