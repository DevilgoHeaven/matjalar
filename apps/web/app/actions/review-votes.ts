'use server';

import { revalidatePath } from 'next/cache';
import type { Database } from '@mzr/db';
import { isCurrentAppUserActive } from '@/lib/auth/active-app-user';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/z-schemas/common';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ReviewRow = Pick<TableRow<'reviews'>, 'id' | 'combo_id' | 'status'>;
type ComboRow = Pick<TableRow<'combos'>, 'id' | 'status'>;
type ReviewVoteIdRow = Pick<TableRow<'review_votes'>, 'id'>;

export type ToggleReviewVoteResult =
  | { ok: true; voted: boolean }
  | { ok: false; error: string };

/**
 * 후기 따봉 토글.
 *
 * review_votes 는 대표 후기 선정의 근거 데이터다. 공개 조합의 공개 후기만
 * 대상으로 허용하며, RLS 우회 시도와 Server Action 입력 오류를 동시에 막는다.
 */
export async function toggleReviewVote(
  reviewId: string
): Promise<ToggleReviewVoteResult> {
  const parsed = uuidSchema.safeParse(reviewId);
  if (!parsed.success) {
    return { ok: false, error: '잘못된 후기 주소입니다.' };
  }

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return { ok: false, error: userError.message };
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  if (!(await isCurrentAppUserActive())) {
    return { ok: false, error: '현재 계정 상태에서는 후기 따봉을 할 수 없습니다.' };
  }

  const { data: review, error: reviewError } = await db
    .from('reviews')
    .select<ReviewRow>('id, combo_id, status')
    .eq('id', parsed.data)
    .eq('status', 'published')
    .maybeSingle();

  if (reviewError) return { ok: false, error: reviewError.message };
  if (!review) return { ok: false, error: '공개된 후기를 찾을 수 없습니다.' };

  const { data: combo, error: comboError } = await db
    .from('combos')
    .select<ComboRow>('id, status')
    .eq('id', review.combo_id)
    .eq('status', 'published')
    .maybeSingle();

  if (comboError) return { ok: false, error: comboError.message };
  if (!combo) return { ok: false, error: '공개된 조합을 찾을 수 없습니다.' };

  const { data: existing, error: existingError } = await db
    .from('review_votes')
    .select<ReviewVoteIdRow>('id')
    .eq('review_id', parsed.data)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  const nextVoted = !existing;
  const mutation = existing
    ? db.from('review_votes').delete().eq('id', existing.id)
    : db.from('review_votes').insert({
        review_id: parsed.data,
        user_id: user.id,
      });

  const { error: mutationError } = await mutation;
  if (mutationError) return { ok: false, error: mutationError.message };

  revalidatePath(`/combo/${review.combo_id}`);
  return { ok: true, voted: nextVoted };
}
