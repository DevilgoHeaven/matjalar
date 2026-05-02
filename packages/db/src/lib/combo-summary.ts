/**
 * 조합 카드의 한 줄 요약 텍스트를 생성하는 순수 함수 모듈.
 *
 * 브랜드별 템플릿이 다르며 (PRD §6 참조), 등록·수정 시 서버에서 한 번 계산해
 * combos.card_summary 컬럼에 저장한다 (N+1 쿼리 회피 목적).
 *
 * WHY NFC normalize: 한국어 문자열은 조합형(NFD)·완성형(NFC) 혼재 가능.
 * 같은 글자라도 내부 코드포인트가 달라 슬라이싱·비교에서 오작동할 수 있음.
 * 참고: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
 */

/**
 * 단일 옵션 항목을 나타내는 타입.
 *
 * @property actionType  옵션 행위 종류: 선택/제외/추가
 * @property groupName   옵션 그룹 이름 (예: "빵 종류", "소스")
 * @property itemName    옵션 항목 이름 (예: "허니오트", "랜치")
 * @property sortOrder   표시 순서 (낮을수록 먼저)
 */
export type ComboOption = {
  actionType: 'select' | 'exclude' | 'add';
  groupName: string;
  itemName: string;
  sortOrder: number;
};

/** 브랜드 슬러그 유니온 타입 */
type BrandSlug = 'subway' | 'gongcha' | 'starbucks' | 'cvs';

/**
 * buildCardSummary 의 입력 파라미터 타입
 *
 * @property brandSlug    브랜드 식별자 (템플릿 분기에 사용)
 * @property menuName     메뉴 이름 (예: "BMT", "밀크폼 블랙티")
 * @property variantName  메뉴 변형 이름 (예: "15cm", "레귤러")
 * @property options      선택된 옵션 목록
 */
type BuildCardSummaryInput = {
  brandSlug: BrandSlug;
  menuName: string;
  variantName: string;
  options: ComboOption[];
};

/**
 * NFC 정규화 헬퍼.
 *
 * WHY: 입력마다 일관되게 적용하기 위해 함수로 분리.
 * 빈 문자열·공백이 들어와도 안전하게 처리.
 */
function nfc(s: string): string {
  return s.normalize('NFC').trim();
}

/**
 * 특정 그룹에서 첫 번째 항목 이름을 반환하고, 그룹 내 항목이 2개 이상이면
 * "항목명 외 N" 형태로 반환한다.
 *
 * WHY: PRD §6에서 "소스(외 N)" 같은 축약 표기를 요구하므로 그룹 단위 집계 필요.
 *
 * @param options    전체 옵션 목록
 * @param groupName  대상 그룹 이름 (NFC 정규화 후 비교)
 * @returns          대표 항목명 또는 "대표명 외 N", 해당 그룹 없으면 빈 문자열
 */
function firstItemWithCount(options: ComboOption[], groupName: string): string {
  const normalizedGroup = nfc(groupName);

  // I-1 review fix: exclude(빼기) 옵션은 카드 요약에 노출하지 않음 (PRD §6 의도)
  // sortOrder 오름차순 정렬 후 그룹 + 비-exclude 필터링
  const grouped = options
    .filter((o) => o.actionType !== 'exclude' && nfc(o.groupName) === normalizedGroup)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (grouped.length === 0) return '';

  const firstName = nfc(grouped[0].itemName);
  const extraCount = grouped.length - 1;

  // 같은 그룹에 2개 이상이면 "첫번째 외 N" 형태로 표기
  return extraCount > 0 ? `${firstName} 외 ${extraCount}` : firstName;
}

/**
 * 그룹 이름 목록 중 첫 번째로 매칭되는 그룹의 대표 항목 문자열을 반환한다.
 *
 * WHY: 브랜드마다 그룹 이름 규칙이 달라 우선순위 fallback이 필요.
 *
 * @param options     전체 옵션 목록
 * @param groupNames  우선순위 순서의 그룹 이름 후보 배열
 * @returns           첫 번째로 발견된 그룹의 대표 문자열, 없으면 빈 문자열
 */
function firstMatchingGroup(options: ComboOption[], groupNames: string[]): string {
  for (const name of groupNames) {
    const result = firstItemWithCount(options, name);
    if (result) return result;
  }
  return '';
}

/**
 * 서브웨이 카드 요약을 생성한다.
 *
 * PRD §6 템플릿: `${menuName} ${variantName} · ${빵} · ${소스(외 N)}`
 *
 * WHY: 서브웨이는 메뉴명과 사이즈가 합쳐진 변형명(예: "BMT 15cm")을 사용하므로
 * variantName이 이미 사이즈를 포함. 빵과 소스는 핵심 구별 요소.
 */
function buildSubwaySummary(
  menuName: string,
  variantName: string,
  options: ComboOption[]
): string {
  const bread = firstMatchingGroup(options, ['빵 종류', '빵']);
  const sauce = firstMatchingGroup(options, ['소스', '드레싱']);

  const parts: string[] = [`${nfc(menuName)} ${nfc(variantName)}`];
  if (bread) parts.push(bread);
  if (sauce) parts.push(sauce);

  return parts.join(' · ');
}

/**
 * 공차 카드 요약을 생성한다.
 *
 * PRD §6 템플릿: `${menuName} · ${당도} · ${얼음} · ${토핑(외 N)}`
 */
function buildGongchaSummary(
  menuName: string,
  options: ComboOption[]
): string {
  const sweetness = firstMatchingGroup(options, ['당도', '설탕']);
  const ice = firstMatchingGroup(options, ['얼음', '아이스']);
  const topping = firstMatchingGroup(options, ['토핑', '추가토핑']);

  const parts: string[] = [nfc(menuName)];
  if (sweetness) parts.push(sweetness);
  if (ice) parts.push(ice);
  if (topping) parts.push(topping);

  return parts.join(' · ');
}

/**
 * 스타벅스 카드 요약을 생성한다.
 *
 * PRD §6 템플릿: `${menuName} · ${샷/시럽} · ${우유} · ${휘핑}`
 */
function buildStarbucksSummary(
  menuName: string,
  options: ComboOption[]
): string {
  // 샷 또는 시럽 중 먼저 발견된 것을 사용
  const shotOrSyrup = firstMatchingGroup(options, ['샷', '시럽', '에스프레소']);
  const milk = firstMatchingGroup(options, ['우유', '밀크']);
  const whipping = firstMatchingGroup(options, ['휘핑', '휘핑크림']);

  const parts: string[] = [nfc(menuName)];
  if (shotOrSyrup) parts.push(shotOrSyrup);
  if (milk) parts.push(milk);
  if (whipping) parts.push(whipping);

  return parts.join(' · ');
}

/**
 * 편의점(CVS) 카드 요약을 생성한다.
 *
 * PRD §6 템플릿: `${메인} · ${추가} · ${조리}`
 */
function buildCvsSummary(
  menuName: string,
  options: ComboOption[]
): string {
  const extra = firstMatchingGroup(options, ['추가', '사이드', '추가구성']);
  const cooking = firstMatchingGroup(options, ['조리', '조리방법', '가열']);

  const parts: string[] = [nfc(menuName)];
  if (extra) parts.push(extra);
  if (cooking) parts.push(cooking);

  return parts.join(' · ');
}

/**
 * 브랜드별 템플릿에 맞는 조합 카드 한 줄 요약 텍스트를 생성한다.
 *
 * 결과 예시:
 *  - subway: "BMT 15cm · 위트 · 랜치 외 1"
 *  - gongcha: "밀크폼 블랙티 · 반당 · 소량"
 *  - starbucks: "카라멜 마키아또 · 샷 추가 · 귀리 · 휘핑 없음"
 *  - cvs: "삼각김밥 · 참치마요 · 전자레인지"
 *
 * @param input  브랜드 슬러그, 메뉴명, 변형명, 옵션 목록
 * @returns      한 줄 요약 문자열
 */
export function buildCardSummary(input: BuildCardSummaryInput): string {
  const { brandSlug, menuName, variantName, options } = input;

  switch (brandSlug) {
    case 'subway':
      return buildSubwaySummary(menuName, variantName, options);

    case 'gongcha':
      // 공차는 variantName(사이즈)을 별도 강조하지 않고 menuName에 통합 표기
      return buildGongchaSummary(menuName, options);

    case 'starbucks':
      return buildStarbucksSummary(menuName, options);

    case 'cvs':
      return buildCvsSummary(menuName, options);

    default: {
      // 컴파일타임에 exhaustive check: 새 브랜드 추가 시 여기서 에러 발생
      const _exhaustive: never = brandSlug;
      throw new Error(`알 수 없는 브랜드 슬러그: ${_exhaustive}`);
    }
  }
}
