import 'server-only';

import type { BrandListCombo } from '@/app/brand/[slug]/data';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@mzr/db';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ComboRow = TableRow<'combos'>;
type BrandRow = TableRow<'brands'>;
type ComboStatsRow = TableRow<'combo_stats'>;
type ComboTagRow = TableRow<'combo_tags'>;
type TagRow = TableRow<'tags'>;

type ComboQueryRow = Pick<
  ComboRow,
  | 'id'
  | 'title'
  | 'card_summary'
  | 'estimated_price'
  | 'price_status'
  | 'published_at'
  | 'brand_id'
>;
type BrandQueryRow = Pick<
  BrandRow,
  'id' | 'name' | 'slug' | 'last_verified_at'
>;
type ComboStatsQueryRow = Pick<
  ComboStatsRow,
  'combo_id' | 'vote_count' | 'bookmark_count' | 'review_count' | 'average_rating' | 'hot_score'
>;
type ComboTagQueryRow = Pick<ComboTagRow, 'combo_id' | 'tag_id'>;
type TagQueryRow = Pick<TagRow, 'id' | 'slug' | 'label' | 'emoji' | 'sort_order'>;

export interface PublicCombo extends BrandListCombo {
  brand: {
    name: string;
    slug: string;
    lastVerifiedAt: string | null;
  };
  bookmarkCount: number;
  tagSlugs: string[];
}

export async function loadPublishedCombos(limit = 120): Promise<PublicCombo[]> {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  const { data: combos, error: combosError } = await db
    .from('combos')
    .select<ComboQueryRow>(
      'id, title, card_summary, estimated_price, price_status, published_at, brand_id'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (combosError) throw new Error(combosError.message);
  const comboRows = combos ?? [];
  if (!comboRows.length) return [];

  const comboIds = comboRows.map((combo) => combo.id);
  const brandIds = [...new Set(comboRows.map((combo) => combo.brand_id))];

  const [brandsResult, statsResult, tagResult] = await Promise.all([
    db
      .from('brands')
      .select<BrandQueryRow>('id, name, slug, last_verified_at')
      .in('id', brandIds),
    db
      .from('combo_stats')
      .select<ComboStatsQueryRow>(
        'combo_id, vote_count, bookmark_count, review_count, average_rating, hot_score'
      )
      .in('combo_id', comboIds),
    loadTagsByComboId(comboIds),
  ]);

  if (brandsResult.error) throw new Error(brandsResult.error.message);
  if (statsResult.error) throw new Error(statsResult.error.message);

  const brandById = new Map((brandsResult.data ?? []).map((brand) => [brand.id, brand]));
  const statsById = new Map((statsResult.data ?? []).map((stats) => [stats.combo_id, stats]));

  return comboRows
    .map((combo) => {
      const brand = brandById.get(combo.brand_id);
      if (!brand) return null;
      const stats = statsById.get(combo.id);
      const tags = tagResult.get(combo.id) ?? [];
      return {
        id: combo.id,
        title: combo.title,
        cardSummary: combo.card_summary,
        estimatedPrice: combo.estimated_price,
        priceStatus: combo.price_status,
        publishedAt: combo.published_at,
        brand: {
          name: brand.name,
          slug: brand.slug,
          lastVerifiedAt: brand.last_verified_at,
        },
        stats: {
          voteCount: stats?.vote_count ?? 0,
          reviewCount: stats?.review_count ?? 0,
          averageRating: stats?.average_rating ?? 0,
          hotScore: stats?.hot_score ?? 0,
        },
        bookmarkCount: stats?.bookmark_count ?? 0,
        tags: tags.slice(0, 3).map(({ label, emoji }) => ({ label, emoji })),
        tagSlugs: tags.map((tag) => tag.slug),
      };
    })
    .filter((combo): combo is PublicCombo => combo !== null);
}

async function loadTagsByComboId(comboIds: string[]) {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  const { data: comboTags, error: comboTagsError } = await db
    .from('combo_tags')
    .select<ComboTagQueryRow>('combo_id, tag_id')
    .in('combo_id', comboIds);

  if (comboTagsError) throw new Error(comboTagsError.message);

  const tagIds = [...new Set((comboTags ?? []).map((row) => row.tag_id))];
  if (!tagIds.length) {
    return new Map<string, (TagQueryRow & { sortOrder: number })[]>();
  }

  const { data: tags, error: tagsError } = await db
    .from('tags')
    .select<TagQueryRow>('id, slug, label, emoji, sort_order')
    .in('id', tagIds);

  if (tagsError) throw new Error(tagsError.message);

  const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag]));
  const tagsByComboId = new Map<string, (TagQueryRow & { sortOrder: number })[]>();

  for (const comboTag of comboTags ?? []) {
    const tag = tagById.get(comboTag.tag_id);
    if (!tag) continue;
    const current = tagsByComboId.get(comboTag.combo_id) ?? [];
    current.push({ ...tag, sortOrder: tag.sort_order });
    tagsByComboId.set(comboTag.combo_id, current);
  }

  return new Map(
    [...tagsByComboId.entries()].map(([comboId, comboTagsForCombo]) => [
      comboId,
      comboTagsForCombo.sort((a, b) => a.sortOrder - b.sortOrder),
    ])
  );
}
