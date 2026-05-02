/**
 * 조합의 고유 서명(해시)을 생성하는 순수 비동기 함수 모듈.
 *
 * 같은 메뉴 변형 + 같은 옵션 조합이면 항상 동일한 hex 문자열을 반환한다.
 * combos 테이블의 UNIQUE 제약 또는 중복 조합 감지에 사용한다.
 *
 * WHY Web Crypto (crypto.subtle):
 *  - Node 20+과 Edge Runtime(Vercel) 양쪽에서 전역으로 사용 가능.
 *  - 외부 라이브러리 불필요, 번들 크기 영향 없음.
 *  참고: https://nodejs.org/api/webcrypto.html
 *
 * WHY SHA-256:
 *  - 충돌 가능성이 극히 낮고 고정 길이(64자 hex) 출력.
 *  - 보안 목적이 아닌 식별자 중복 감지이므로 SHA-256으로 충분.
 */

/**
 * 서명 계산에 사용하는 단일 옵션 항목 타입.
 *
 * @property actionType     옵션 행위 종류: 선택/제외/추가
 * @property optionGroupId  옵션 그룹 UUID
 * @property optionItemId   옵션 항목 UUID
 */
export type SignatureOption = {
  actionType: 'select' | 'exclude' | 'add';
  optionGroupId: string;
  optionItemId: string;
};

/**
 * buildComboSignature 의 입력 파라미터 타입
 *
 * @property brandId         브랜드 UUID
 * @property menuVariantId   메뉴 변형 UUID
 * @property options         선택된 옵션 목록 (순서 무관 — 내부에서 정렬)
 */
type BuildComboSignatureInput = {
  brandId: string;
  menuVariantId: string;
  options: SignatureOption[];
};

/**
 * ArrayBuffer를 소문자 16진수 문자열로 변환한다.
 *
 * WHY: crypto.subtle.digest() 는 ArrayBuffer를 반환하므로
 * 가독성 있는 hex string으로 변환하는 헬퍼가 필요하다.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 브랜드 + 메뉴 변형 + 옵션 조합으로 SHA-256 hex 서명을 생성한다.
 *
 * 알고리즘:
 *  1. 각 옵션을 `${actionType}:${optionGroupId}:${optionItemId}` 형태로 직렬화
 *  2. 정렬(sort) → 입력 순서와 무관하게 동일 결과 보장
 *  3. `|` 구분자로 조인
 *  4. `${brandId}:${menuVariantId}:${parts}` 로 최종 텍스트 구성
 *  5. NFC 정규화 → 한국어 포함 UUID라도 안전
 *  6. SHA-256 해시 → 64자 hex 반환
 *
 * WHY 정렬 필수: 옵션 목록은 API 응답 순서에 따라 달라질 수 있으므로
 * 순서를 고정해야 "같은 조합 = 같은 해시" 불변식이 유지된다.
 *
 * @param input  브랜드 ID, 메뉴 변형 ID, 옵션 목록
 * @returns      SHA-256 hex 문자열 (64자)
 */
export async function buildComboSignature(input: BuildComboSignatureInput): Promise<string> {
  const { brandId, menuVariantId, options } = input;

  // C-1 review fix: sort 이전에 각 필드별로 NFC 정규화 적용
  //  → optionGroupId·optionItemId 가 슬러그(한글 가능)일 경우 정렬 결과의 결정성 보장
  // 참고: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
  const parts = options
    .map(
      (o) =>
        `${o.actionType}:${o.optionGroupId.normalize('NFC')}:${o.optionItemId.normalize('NFC')}`
    )
    .sort()
    .join('|');

  // brandId / menuVariantId 도 NFC 정규화 (UUID 가 아닌 슬러그일 가능성 대비)
  const text = `${brandId.normalize('NFC')}:${menuVariantId.normalize('NFC')}:${parts}`;

  // TextEncoder로 UTF-8 바이트 배열 변환 후 SHA-256 해시
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);

  return bufferToHex(hashBuffer);
}
