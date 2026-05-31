/**
 * 카테고리 홈(/) 데이터 조회
 *
 * PRD §5 v1 카테고리 홈 정책:
 *  - 카테고리 그리드 (7종, active 브랜드 있는 카테고리만 활성)
 *  - 오늘의 인기 조합 (combo_stats.hot_score DESC)
 *
 * v1 은 서브웨이 1개 브랜드만 active 이므로 fastfood 만 활성 카드.
 * 빈 카테고리는 "준비중" 배지로 비활성 — UI 책임 (CATEGORY_TOKENS.active).
 */
import 'server-only';

import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@mzr/db';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type CategoryRow = TableRow<'categories'>;
type BrandRow = TableRow<'brands'>;
type ComboRow = TableRow<'combos'>;
type ComboStatsRow = TableRow<'combo_stats'>;
type ComboTagRow = TableRow<'combo_tags'>;
type TagRow = TableRow<'tags'>;

type CategoryQueryRow = Pick<
  CategoryRow,
  'id' | 'label' | 'emoji' | 'is_active' | 'sort_order'
>;
type BrandQueryRow = Pick<BrandRow, 'id' | 'name' | 'slug' | 'category_id'>;
type ComboQueryRow = Pick<
  ComboRow,
  'id' | 'title' | 'card_summary' | 'estimated_price' | 'price_status' | 'brand_id'
>;
type ComboStatsQueryRow = Pick<
  ComboStatsRow,
  'combo_id' | 'hot_score' | 'vote_count' | 'review_count' | 'average_rating'
>;
type ComboTagQueryRow = Pick<ComboTagRow, 'combo_id' | 'tag_id'>;
type TagQueryRow = Pick<TagRow, 'id' | 'slug' | 'label' | 'emoji' | 'sort_order'>;

export interface HomeCategory {
  id: string;
  label: string;
  emoji: string;
  isActive: boolean;
  /** active brand 1개일 때 직접 이동할 brand slug — 없으면 비활성 카드 */
  primaryBrandSlug: string | null;
}

export interface HomeHotCombo {
  id: string;
  title: string;
  cardSummary: string;
  estimatedPrice: number;
  priceStatus: string;
  brand: { name: string; slug: string };
  stats: {
    voteCount: number;
    reviewCount: number;
    averageRating: number;
    hotScore: number;
  };
  tags: { label: string; emoji: string | null }[];
}

export interface HomePageData {
  categories: HomeCategory[];
  hotCombos: HomeHotCombo[];
}

/**
 * 카테고리 홈에 필요한 모든 데이터를 한 번에 가져온다.
 *
 * Server Component 진입에서 호출. RLS 가 익명 SELECT 차단 안 함 (categories/brands/combos
 * published 만 anon SELECT 허용).
 */
export async function getHomePageData(): Promise<HomePageData> {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  // 1. 카테고리 7종 (정의 순서)
  const { data: categories, error: catError } = await db
    .from('categories')
    .select<CategoryQueryRow>('id, label, emoji, is_active, sort_order')
    .order('sort_order');
  if (catError) throw new Error(catError.message);

  // 2. is_active=true 브랜드만 — 카테고리 → primary brand slug 매핑
  const { data: brands, error: brandError } = await db
    .from('brands')
    .select<BrandQueryRow>('id, name, slug, category_id')
    .eq('is_active', true);
  if (brandError) throw new Error(brandError.message);

  const activeBrandByCategory = new Map<string, BrandQueryRow>();
  for (const brand of brands ?? []) {
    if (!activeBrandByCategory.has(brand.category_id)) {
      activeBrandByCategory.set(brand.category_id, brand);
    }
  }

  const homeCategories: HomeCategory[] = (categories ?? []).map((cat) => {
    const brand = activeBrandByCategory.get(cat.id);
    return {
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      isActive: Boolean(brand),
      primaryBrandSlug: brand?.slug ?? null,
    };
  });

  // 3. 오늘의 인기 조합 — combo_stats.hot_score DESC 상위 6개
  //    (PRD §5 v1: 첫 60개 조합 등록 전엔 비어 있을 수 있음 — EmptyState UI)
  const { data: hotStats, error: hotError } = await db
    .from('combo_stats')
    .select<ComboStatsQueryRow>(
      'combo_id, hot_score, vote_count, review_count, average_rating'
    )
    .order('hot_score', { ascending: false })
    .limit(6);
  if (hotError) throw new Error(hotError.message);

  const hotComboIds = (hotStats ?? []).map((s) => s.combo_id);
  if (hotComboIds.length === 0) {
    return { categories: homeCategories, hotCombos: [] };
  }

  // 4. 인기 조합의 본체 — published 만 (RLS 가 강제하지만 명시)
  const { data: combos, error: combosError } = await db
    .from('combos')
    .select<ComboQueryRow>(
      'id, title, card_summary, estimated_price, price_status, brand_id'
    )
    .in('id', hotComboIds)
    .eq('status', 'published');
  if (combosError) throw new Error(combosError.message);

  // 5. 브랜드 정보 join (name + slug)
  const comboRows = combos ?? [];
  const brandIds = [...new Set(comboRows.map((c) => c.brand_id))];
  const [comboBrandsResult, tagsByComboId] = await Promise.all([
    brandIds.length
      ? db
          .from('brands')
          .select<Pick<BrandRow, 'id' | 'name' | 'slug'>>('id, name, slug')
          .in('id', brandIds)
      : Promise.resolve({ data: [], error: null }),
    loadTagsByComboId(hotComboIds),
  ]);
  const { data: comboBrands, error: comboBrandsError } = comboBrandsResult;
  if (comboBrandsError) throw new Error(comboBrandsError.message);

  const brandById = new Map(
    (comboBrands ?? []).map((b) => [b.id, b])
  );
  const statsById = new Map((hotStats ?? []).map((s) => [s.combo_id, s]));

  // hot_score DESC 순서 유지 (combo_stats 정렬 그대로)
  const orderedCombos: HomeHotCombo[] = hotComboIds
    .map((id) => {
      const combo = (combos ?? []).find((c) => c.id === id);
      if (!combo) return null;
      const brand = brandById.get(combo.brand_id);
      const stats = statsById.get(combo.id);
      if (!brand) return null;
      return {
        id: combo.id,
        title: combo.title,
        cardSummary: combo.card_summary,
        estimatedPrice: combo.estimated_price,
        priceStatus: combo.price_status,
        brand: { name: brand.name, slug: brand.slug },
        stats: {
          voteCount: stats?.vote_count ?? 0,
          reviewCount: stats?.review_count ?? 0,
          averageRating: stats?.average_rating ?? 0,
          hotScore: stats?.hot_score ?? 0,
        },
        tags: (tagsByComboId.get(combo.id) ?? [])
          .slice(0, 3)
          .map(({ label, emoji }) => ({ label, emoji })),
      };
    })
    .filter((c): c is HomeHotCombo => c !== null);

  return {
    categories: homeCategories,
    hotCombos: orderedCombos,
  };
}

async function loadTagsByComboId(comboIds: string[]) {
  if (!comboIds.length) {
    return new Map<string, (TagQueryRow & { sortOrder: number })[]>();
  }

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
