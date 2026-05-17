import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@mzr/db';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type BrandRow = TableRow<'brands'>;
type ComboRow = TableRow<'combos'>;
type ComboStatsRow = TableRow<'combo_stats'>;
type ComboTagRow = TableRow<'combo_tags'>;
type TagRow = TableRow<'tags'>;

type BrandQueryRow = Pick<
  BrandRow,
  'id' | 'name' | 'slug' | 'launch_status' | 'is_active'
>;
type ComboListQueryRow = Pick<
  ComboRow,
  | 'id'
  | 'title'
  | 'card_summary'
  | 'estimated_price'
  | 'price_status'
  | 'published_at'
>;
type ComboStatsQueryRow = Pick<
  ComboStatsRow,
  'combo_id' | 'vote_count' | 'review_count' | 'average_rating' | 'hot_score'
>;
type ComboTagQueryRow = Pick<ComboTagRow, 'combo_id' | 'tag_id'>;
type TagQueryRow = Pick<TagRow, 'id' | 'label' | 'emoji' | 'sort_order'>;

export interface BrandListCombo {
  id: string;
  title: string;
  cardSummary: string;
  estimatedPrice: number;
  priceStatus: string;
  publishedAt: string | null;
  stats: {
    voteCount: number;
    reviewCount: number;
    averageRating: number;
    hotScore: number;
  };
  tags: {
    label: string;
    emoji: string | null;
  }[];
}

export interface BrandPageData {
  brand: {
    id: string;
    name: string;
    slug: string;
    launchStatus: string;
    isActive: boolean;
  };
  combos: BrandListCombo[];
}

export async function getBrandMetadata(
  slug: string
): Promise<{ name: string } | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const { data: brand, error } = await db
    .from('brands')
    .select<Pick<BrandRow, 'name' | 'is_active'>>('name, is_active')
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!brand || !brand.is_active) return null;

  return { name: brand.name };
}

export async function getBrandPageData(
  slug: string
): Promise<BrandPageData | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  const { data: brand, error: brandError } = await db
    .from('brands')
    .select<BrandQueryRow>('id, name, slug, launch_status, is_active')
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (brandError) throw new Error(brandError.message);
  if (!brand || !brand.is_active) return null;

  const { data: combos, error: combosError } = await db
    .from('combos')
    .select<ComboListQueryRow>(
      'id, title, card_summary, estimated_price, price_status, published_at'
    )
    .eq('brand_id', brand.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (combosError) throw new Error(combosError.message);

  const comboRows = combos ?? [];
  const comboIds = comboRows.map((combo) => combo.id);

  const [statsByComboId, tagsByComboId] = comboIds.length
    ? await Promise.all([
        getStatsByComboId(comboIds),
        getTagsByComboId(comboIds),
      ])
    : [
        new Map<string, ComboStatsQueryRow>(),
        new Map<string, BrandListCombo['tags']>(),
      ];

  const sortedCombos = comboRows
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

  return {
    brand: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      launchStatus: brand.launch_status,
      isActive: brand.is_active,
    },
    combos: sortedCombos,
  };
}

async function getStatsByComboId(comboIds: string[]) {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const { data, error } = await db
    .from('combo_stats')
    .select<ComboStatsQueryRow>(
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
    .select<ComboTagQueryRow>('combo_id, tag_id')
    .in('combo_id', comboIds);

  if (comboTagsError) throw new Error(comboTagsError.message);

  const tagIds = [...new Set((comboTags ?? []).map((row) => row.tag_id))];
  if (tagIds.length === 0) return new Map<string, BrandListCombo['tags']>();

  const { data: tags, error: tagsError } = await db
    .from('tags')
    .select<TagQueryRow>('id, label, emoji, sort_order')
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
