'use server';

import { revalidatePath } from 'next/cache';
import type { Database } from '@mzr/db';
import { isCurrentAppUserActive } from '@/lib/auth/active-app-user';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/z-schemas/common';

type ComboVoteIdRow = Pick<
  Database['public']['Tables']['combo_votes']['Row'],
  'id'
>;
type ComboBrandRow = Pick<
  Database['public']['Tables']['combos']['Row'],
  'id' | 'brand_id'
>;
type BrandSlugRow = Pick<Database['public']['Tables']['brands']['Row'], 'slug'>;

export type ToggleVoteResult =
  | { ok: true; voted: boolean }
  | { ok: false; error: string };

/**
 * 조합 따봉 토글.
 *
 * combo_votes row 를 source of truth 로 두고, combo_stats 는 RPC 로 즉시 보정한다.
 * RPC 실패는 M3 범위에서는 best-effort 로 남기고, vote row 성공은 유지한다.
 */
export async function toggleVote(comboId: string): Promise<ToggleVoteResult> {
  const parsed = uuidSchema.safeParse(comboId);
  if (!parsed.success) {
    return { ok: false, error: '잘못된 조합 주소입니다.' };
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
    return { ok: false, error: '현재 계정 상태에서는 따봉할 수 없습니다.' };
  }

  const { data: combo, error: comboError } = await db
    .from('combos')
    .select<ComboBrandRow>('id, brand_id')
    .eq('id', parsed.data)
    .eq('status', 'published')
    .maybeSingle();

  if (comboError) return { ok: false, error: comboError.message };
  if (!combo) return { ok: false, error: '공개된 조합을 찾을 수 없습니다.' };

  const { data: existing, error: existingError } = await db
    .from('combo_votes')
    .select<ComboVoteIdRow>('id')
    .eq('combo_id', parsed.data)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  const nextVoted = !existing;
  const delta = nextVoted ? 1 : -1;

  const mutation = existing
    ? db.from('combo_votes').delete().eq('id', existing.id)
    : db
        .from('combo_votes')
        .insert({ combo_id: parsed.data, user_id: user.id });

  const { error: mutationError } = await mutation;
  if (mutationError) return { ok: false, error: mutationError.message };

  const { error: statsError } = await db.rpc<undefined>('update_combo_stats', {
    p_combo: parsed.data,
    p_kind: 'vote',
    p_delta: delta,
  });

  if (statsError) {
    console.warn('[toggleVote] combo_stats 갱신 실패:', statsError.message);
  }

  revalidatePath(`/combo/${parsed.data}`);
  const { data: brand } = await db
    .from('brands')
    .select<BrandSlugRow>('slug')
    .eq('id', combo.brand_id)
    .maybeSingle();
  if (brand?.slug) revalidatePath(`/brand/${brand.slug}`);

  return { ok: true, voted: nextVoted };
}
