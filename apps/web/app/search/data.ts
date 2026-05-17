import type { BrandListCombo } from '@/app/brand/[slug]/data';
import type { Database } from '@mzr/db';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ComboRow = Pick<
  TableRow<'combos'>,
  | 'id'
  | 'title'
  | 'card_summary'
  | 'estimated_price'
  | 'price_status'
  | 'published_at'
>;
type ComboStatsRow = Pick<
  TableRow<'combo_stats'>,
  'combo_id' | 'vote_count' | 'review_count' | 'average_rating' | 'hot_score'
>;
type ComboTagRow = Pick<TableRow<'combo_tags'>, 'combo_id' | 'tag_id'>;
type TagRow = Pick<TableRow<'tags'>, 'id' | 'label' | 'emoji' | 'sort_order'>;

export async function searchCombos(query: string): Promise<BrandListCombo[]> {
  const normalizedQuery = query.normalize('NFC').trim();
  if (!normalizedQuery) return [];

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const { data: combos, error } = await db.rpc<ComboRow[]>(
    'search_published_combos',
    {
      p_query: normalizedQuery,
      p_limit: 50,
    }
  );

  if (error) throw new Error(error.message);
  const comboRows = combos ?? [];
  if (comboRows.length === 0) return [];

  const comboIds = comboRows.map((combo) => combo.id);
  const [statsByComboId, tagsByComboId] = await Promise.all([
    getStatsByComboId(comboIds),
    getTagsByComboId(comboIds),
  ]);

  return comboRows
    .map((combo) => {
      const stats = statsByComboId.get(combo.id);
      return {
        id: combo.id,
        title: combo.title,
        cardSummary: combo.card_summary,
        estimatedPrice: combo.estimated_price,
        priceStatus: combo.price_status,
        publishedAt: combo.published_at,
        stats: {
          voteCount: stats?.vote_count ?? 0,
          reviewCount: stats?.review_count ?? 0,
          averageRating: stats?.average_rating ?? 0,
          hotScore: stats?.hot_score ?? 0,
        },
        tags: tagsByComboId.get(combo.id) ?? [],
      };
    })
    .sort((a, b) => b.stats.hotScore - a.stats.hotScore);
}

async function getStatsByComboId(comboIds: string[]) {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const { data, error } = await db
    .from('combo_stats')
    .select<ComboStatsRow>(
      'combo_id, vote_count, review_count, average_rating, hot_score'
    )
    .in('combo_id', comboIds);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((stats) => [stats.combo_id, stats]));
}

async function getTagsByComboId(comboIds: string[]) {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  const { data: comboTags, error: comboTagsError } = await db
    .from('combo_tags')
    .select<ComboTagRow>('combo_id, tag_id')
    .in('combo_id', comboIds);

  if (comboTagsError) throw new Error(comboTagsError.message);

  const tagIds = [...new Set((comboTags ?? []).map((row) => row.tag_id))];
  if (tagIds.length === 0) return new Map<string, BrandListCombo['tags']>();

  const { data: tags, error: tagsError } = await db
    .from('tags')
    .select<TagRow>('id, label, emoji, sort_order')
    .in('id', tagIds);

  if (tagsError) throw new Error(tagsError.message);

  const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag]));
  const tagsByComboId = new Map<
    string,
    (BrandListCombo['tags'][number] & { sortOrder: number })[]
  >();

  for (const comboTag of comboTags ?? []) {
    const tag = tagById.get(comboTag.tag_id);
    if (!tag) continue;
    const current = tagsByComboId.get(comboTag.combo_id) ?? [];
    current.push({
      label: tag.label,
      emoji: tag.emoji,
      sortOrder: tag.sort_order,
    });
    tagsByComboId.set(comboTag.combo_id, current);
  }

  return new Map(
    [...tagsByComboId.entries()].map(([comboId, comboTagsForCombo]) => [
      comboId,
      comboTagsForCombo
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 3)
        .map(({ label, emoji }) => ({ label, emoji })),
    ])
  );
}
