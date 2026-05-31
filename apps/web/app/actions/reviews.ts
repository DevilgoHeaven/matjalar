'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@mzr/db';
import { isCurrentAppUserActive } from '@/lib/auth/active-app-user';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ratingSchema, uuidSchema } from '@/lib/z-schemas/common';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ComboBrandRow = Pick<TableRow<'combos'>, 'id' | 'brand_id'>;
type ReviewExistingRow = Pick<TableRow<'reviews'>, 'id' | 'status'>;
type BrandSlugRow = Pick<TableRow<'brands'>, 'slug'>;

export interface SubmitReviewInput {
  comboId: string;
  rating: number;
  content: string;
}

export type SubmitReviewResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

const reviewContentSchema = z
  .string()
  .transform((value) => value.normalize('NFC').trim())
  .pipe(
    z
      .string()
      .min(1, '후기 내용을 입력해 주세요.')
      .max(140, '후기는 140자 이내로 입력해 주세요.')
  );

const submitReviewSchema = z.object({
  comboId: uuidSchema,
  rating: ratingSchema,
  content: reviewContentSchema,
});

export async function submitReview(
  input: SubmitReviewInput
): Promise<SubmitReviewResult> {
  const parsed = submitReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '후기 입력값을 확인해 주세요.',
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
    return { ok: false, error: '현재 계정 상태에서는 후기를 작성할 수 없습니다.' };
  }

  const { data: combo, error: comboError } = await db
    .from('combos')
    .select<ComboBrandRow>('id, brand_id')
    .eq('id', parsed.data.comboId)
    .eq('status', 'published')
    .maybeSingle();

  if (comboError) return { ok: false, error: comboError.message };
  if (!combo) return { ok: false, error: '공개된 조합을 찾을 수 없습니다.' };

  const { data: existing, error: existingError } = await db
    .from('reviews')
    .select<ReviewExistingRow>('id, status')
    .eq('combo_id', parsed.data.comboId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  const mutation = existing
    ? db
        .from('reviews')
        .update({
          rating: parsed.data.rating,
          content: parsed.data.content,
          status: 'published',
        })
        .eq('id', existing.id)
    : db.from('reviews').insert({
        combo_id: parsed.data.comboId,
        user_id: user.id,
        rating: parsed.data.rating,
        content: parsed.data.content,
        status: 'published',
      });

  const { error: mutationError } = await mutation;
  if (mutationError) return { ok: false, error: mutationError.message };

  const shouldIncrementReviewCount = !existing || existing.status !== 'published';
  if (shouldIncrementReviewCount) {
    const { error: statsError } = await db.rpc<undefined>('update_combo_stats', {
      p_combo: parsed.data.comboId,
      p_kind: 'review',
      p_delta: 1,
    });

    if (statsError) {
      console.warn('[submitReview] combo_stats 갱신 실패:', statsError.message);
    }
  }

  revalidatePath(`/combo/${parsed.data.comboId}`);
  const { data: brand } = await db
    .from('brands')
    .select<BrandSlugRow>('slug')
    .eq('id', combo.brand_id)
    .maybeSingle();
  if (brand?.slug) revalidatePath(`/brand/${brand.slug}`);

  return { ok: true, created: !existing };
}
