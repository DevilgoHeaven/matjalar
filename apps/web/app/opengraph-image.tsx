import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function HomeOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #F4FAF5, #FAFAFA 55%, #FFE8D6)',
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
            프랜차이즈 꿀조합 위키
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#57534E' }}>
            가격 · 주문문 · 추천 이유까지
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
            오늘 뭐 먹을지 30초 안에 끝내기
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
            메뉴판 앞에서 멈추지 않게, 검증된 조합 카드로 바로 고르세요.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 26, fontWeight: 900 }}>
          <div>만원컷</div>
          <div>초보추천</div>
          <div>매운맛</div>
          <div>취향퀴즈</div>
        </div>
      </div>
    ),
    size
  );
}
