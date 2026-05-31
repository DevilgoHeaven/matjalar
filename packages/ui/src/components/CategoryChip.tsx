/**
 * CategoryChip — 카테고리 홈 그리드에서 카테고리 1개를 나타내는 칩.
 *
 * PRD §5 카테고리 홈 정책:
 *  - active=true  : 클릭 가능 — onClick prop 으로 라우팅 처리
 *  - active=false : "준비중" Badge 노출, onClick prop 만 전달 (toast 안내는 호출 측 책임)
 */
import { CATEGORY_TOKENS, type CategoryToken } from '../tokens/categories';
import { Badge } from './Badge';

export interface CategoryChipProps {
  /** categories.ts 에서 가져온 카테고리 토큰 */
  token: CategoryToken;
  /** 클릭 핸들러 — 비활성 카테고리 toast 안내도 호출 측에서 처리 */
  onClick?: () => void;
}

/**
 * CategoryChip (Server Component 호환).
 *
 * 활성 카테고리: 이모지 + 한글 라벨을 클릭 가능한 버튼으로 렌더링.
 * 비활성 카테고리: 동일 레이아웃에 '준비중' Badge 추가.
 */
export function CategoryChip({ token, onClick }: CategoryChipProps) {
  const { emoji, label, color, active } = token;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl p-3 transition-opacity hover:opacity-80 active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
      style={{ backgroundColor: color }}
      aria-label={`${label}${active ? '' : ' (준비중)'}`}
    >
      {/* 카테고리 식별 이모지 */}
      <span className="text-2xl leading-none" aria-hidden="true">
        {emoji}
      </span>

      {/* 한글 라벨 */}
      <span className="text-xs font-semibold text-gray-800">{label}</span>

      {/* 비활성 카테고리에만 준비중 배지 표시 */}
      {!active && (
        <Badge tone="muted">준비중</Badge>
      )}
    </button>
  );
}

// CATEGORY_TOKENS 를 re-export 해 호출 측이 칩 목록을 쉽게 생성할 수 있도록 지원
export { CATEGORY_TOKENS };
