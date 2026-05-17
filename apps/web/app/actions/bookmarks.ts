'use server';

import { revalidatePath } from 'next/cache';
import type { Database } from '@mzr/db';
import { isCurrentAppUserActive } from '@/lib/auth/active-app-user';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/z-schemas/common';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type BookmarkIdRow = Pick<TableRow<'bookmarks'>, 'id'>;
type ComboBrandRow = Pick<TableRow<'combos'>, 'id' | 'brand_id'>;
type BrandSlugRow = Pick<TableRow<'brands'>, 'slug'>;

export type ToggleBookmarkResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; error: string };

export async function toggleBookmark(
  comboId: string
): Promise<ToggleBookmarkResult> {
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
    return { ok: false, error: '현재 계정 상태에서는 찜할 수 없습니다.' };
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
    .from('bookmarks')
    .select<BookmarkIdRow>('id')
    .eq('combo_id', parsed.data)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  const nextBookmarked = !existing;
  const delta = nextBookmarked ? 1 : -1;
  const mutation = existing
    ? db.from('bookmarks').delete().eq('id', existing.id)
    : db.from('bookmarks').insert({ combo_id: parsed.data, user_id: user.id });

  const { error: mutationError } = await mutation;
  if (mutationError) return { ok: false, error: mutationError.message };

  const { error: statsError } = await db.rpc<undefined>('update_combo_stats', {
    p_combo: parsed.data,
    p_kind: 'bookmark',
    p_delta: delta,
  });

  if (statsError) {
    console.warn('[toggleBookmark] combo_stats 갱신 실패:', statsError.message);
  }

  revalidatePath(`/combo/${parsed.data}`);
  const { data: brand } = await db
    .from('brands')
    .select<BrandSlugRow>('slug')
    .eq('id', combo.brand_id)
    .maybeSingle();
  if (brand?.slug) revalidatePath(`/brand/${brand.slug}`);

  return { ok: true, bookmarked: nextBookmarked };
}
