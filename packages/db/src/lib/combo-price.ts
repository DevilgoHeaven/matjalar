/**
 * 조합의 예상 가격을 계산하는 순수 함수 모듈.
 *
 * DB에 저장된 메뉴 변형 기본가에 옵션 delta를 합산한다.
 * 결제 실제 금액이 아니라 "카드에 표시할 예상 가격"이므로
 * 소수점 없이 KRW 정수로 반환한다.
 *
 * WHY 순수 함수: Server Action에서 combo 저장 전 계산, UI에서 실시간 미리보기,
 * 단위 테스트 모두에서 재사용할 수 있어야 하므로 부수효과 없음.
 */

/**
 * 가격 계산에 필요한 단일 옵션 항목 타입.
 *
 * @property actionType   옵션 행위 종류: 선택/제외/추가
 * @property priceDelta   기본가 대비 가격 변동분 (KRW, 음수 허용)
 * @property isSetOption  세트 구성 항목 여부 (true면 항상 가격에 반영)
 */
export type PriceOption = {
  actionType: 'select' | 'exclude' | 'add';
  priceDelta: number;
  isSetOption?: boolean;
};

/**
 * calculateEstimatedPrice 의 입력 파라미터 타입
 *
 * @property menuVariantBasePrice  메뉴 변형의 기본 가격 (KRW)
 * @property options               선택된 옵션 목록
 */
type CalculateEstimatedPriceInput = {
  menuVariantBasePrice: number;
  options: PriceOption[];
};

/**
 * 숫자가 유효한 가격 값인지 검사한다.
 *
 * WHY: JS에서 NaN은 typeof 'number'이므로 별도 검사가 필요하다.
 * 예: Number("abc") → NaN, Infinity도 유효하지 않음.
 */
function isValidPrice(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * 옵션 목록에서 가격에 반영할 delta 합계를 계산한다.
 *
 * 반영 조건 (OR):
 *  1. actionType === 'add'  → 유료 추가 옵션
 *  2. isSetOption === true  → 세트 구성으로 묶인 옵션 (가격 포함)
 *
 * WHY exclude/select는 기본적으로 delta 0이거나 이미 기본가에 반영된
 * 경우가 대부분이므로 isSetOption으로 명시한 경우에만 합산한다.
 */
function sumOptionDeltas(options: PriceOption[]): number {
  return options.reduce((acc, option) => {
    const shouldInclude = option.actionType === 'add' || option.isSetOption === true;
    if (!shouldInclude) return acc;

    // 개별 delta도 유효성 검사: NaN/Infinity면 0으로 클램프
    const delta = isValidPrice(option.priceDelta) ? option.priceDelta : 0;
    return acc + delta;
  }, 0);
}

/**
 * 메뉴 변형 기본가 + 옵션 delta 합산으로 예상 가격을 계산한다.
 *
 * - 기본가 또는 합산 결과가 NaN/Infinity면 0으로 처리 (방어적 처리)
 * - 최솟값 0으로 클램프 (음수 가격 방지)
 * - Math.round로 KRW 정수 반환 (소수점 반올림)
 *
 * @param input  기본 가격과 옵션 목록
 * @returns      KRW 예상 가격 (0 이상의 정수)
 */
export function calculateEstimatedPrice(input: CalculateEstimatedPriceInput): number {
  const { menuVariantBasePrice, options } = input;

  // 기본가 유효성 검사: NaN/Infinity면 0으로 처리
  const basePrice = isValidPrice(menuVariantBasePrice) ? menuVariantBasePrice : 0;
  const optionTotal = sumOptionDeltas(options);

  const raw = basePrice + optionTotal;

  // 최종 합산 결과도 비정상일 수 있으므로 재검사
  const safe = isValidPrice(raw) ? raw : 0;

  // 음수 가격은 현실적으로 불가능하므로 0으로 클램프
  return Math.round(Math.max(0, safe));
}
