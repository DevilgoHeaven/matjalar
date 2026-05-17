'use server';

import { z } from 'zod';
import type { Database } from '@mzr/db';
import { isCurrentAppUserActive } from '@/lib/auth/active-app-user';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/z-schemas/common';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ComboIdRow = Pick<TableRow<'combos'>, 'id'>;
type ReviewTargetRow = Pick<TableRow<'reviews'>, 'id' | 'combo_id' | 'status'>;

export type SubmitReportResult =
  | { ok: true }
  | { ok: false; error: string };

const reportReasonSchema = z
  .string()
  .transform((value) => value.normalize('NFC').trim())
  .pipe(
    z
      .string()
      .min(4, '신고 사유를 조금 더 구체적으로 입력해 주세요.')
      .max(200, '신고 사유는 200자 이내로 입력해 주세요.')
  );

const submitReportSchema = z.object({
  targetType: z.enum(['combo', 'review']),
  targetId: uuidSchema,
  reason: reportReasonSchema,
});

export async function submitReport(input: {
  targetType: 'combo' | 'review';
  targetId: string;
  reason: string;
}): Promise<SubmitReportResult> {
  const parsed = submitReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '신고 입력값을 확인해 주세요.',
    };
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
    return { ok: false, error: '현재 계정 상태에서는 신고할 수 없습니다.' };
  }

  let targetExists = false;
  try {
    targetExists =
      parsed.data.targetType === 'combo'
        ? await publishedComboExists(parsed.data.targetId)
        : await publishedReviewExists(parsed.data.targetId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '신고 대상 확인 실패';
    return { ok: false, error: message };
  }

  if (!targetExists) {
    return { ok: false, error: '신고할 공개 대상을 찾을 수 없습니다.' };
  }

  const { error } = await db.from('reports').insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    user_id: user.id,
    reason: parsed.data.reason,
    status: 'pending',
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function publishedComboExists(comboId: string) {
  const db = asSupabaseQueryClient(await getSupabaseServerClient());
  const { data, error } = await db
    .from('combos')
    .select<ComboIdRow>('id')
    .eq('id', comboId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function publishedReviewExists(reviewId: string) {
  const db = asSupabaseQueryClient(await getSupabaseServerClient());
  const { data: review, error: reviewError } = await db
    .from('reviews')
    .select<ReviewTargetRow>('id, combo_id, status')
    .eq('id', reviewId)
    .eq('status', 'published')
    .maybeSingle();

  if (reviewError) throw new Error(reviewError.message);
  if (!review) return false;

  return publishedComboExists(review.combo_id);
}
