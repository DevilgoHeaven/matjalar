import 'server-only';

import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@mzr/db';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type BrandRow = TableRow<'brands'>;
type CategoryRow = TableRow<'categories'>;

type BrandQueryRow = Pick<
  BrandRow,
  'id' | 'name' | 'slug' | 'category_id' | 'is_active' | 'launch_status' | 'last_verified_at'
>;
type CategoryQueryRow = Pick<CategoryRow, 'id' | 'label' | 'emoji' | 'sort_order'>;

export interface BrandDirectoryItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  launchStatus: string;
  lastVerifiedAt: string | null;
  category: {
    label: string;
    emoji: string;
  };
}

export async function getBrandDirectoryData(): Promise<BrandDirectoryItem[]> {
  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  const [brandsResult, categoriesResult] = await Promise.all([
    db
      .from('brands')
      .select<BrandQueryRow>(
        'id, name, slug, category_id, is_active, launch_status, last_verified_at'
      )
      .order('is_active', { ascending: false })
      .order('name'),
    db
      .from('categories')
      .select<CategoryQueryRow>('id, label, emoji, sort_order')
      .order('sort_order'),
  ]);

  if (brandsResult.error) throw new Error(brandsResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);

  const categoryById = new Map(
    (categoriesResult.data ?? []).map((category) => [category.id, category])
  );

  return (brandsResult.data ?? []).map((brand) => {
    const category = categoryById.get(brand.category_id);
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      isActive: brand.is_active,
      launchStatus: brand.launch_status,
      lastVerifiedAt: brand.last_verified_at,
      category: {
        label: category?.label ?? '기타',
        emoji: category?.emoji ?? '🍽️',
      },
    };
  });
}
