/**
 * 비회원이 인터랙션 시도 시 모달 열고 sessionStorage 에 저장하는 직렬화 객체.
 * 함수 X — 새로고침 후에도 복원 가능해야 함.
 */
export type ActionDescriptor =
  | { type: 'bookmark'; comboId: string }
  | { type: 'vote'; comboId: string }
  | { type: 'reviewVote'; reviewId: string; comboId: string }
  | { type: 'reviewSubmit'; comboId: string; rating: number; content: string }
  | { type: 'comboNew' };
