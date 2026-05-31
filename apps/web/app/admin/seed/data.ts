import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name' | 'slug'>;
type MenuRow = Pick<TableRow<'menus'>, 'id' | 'brand_id' | 'name'>;
type MenuVariantRow = Pick<
  TableRow<'menu_variants'>,
  'id' | 'menu_id' | 'name' | 'base_price' | 'is_default' | 'sort_order'
>;
type OptionGroupRow = Pick<
  TableRow<'option_groups'>,
  | 'id'
  | 'brand_id'
  | 'menu_id'
  | 'name'
  | 'option_role'
  | 'selection_mode'
  | 'min_select'
  | 'max_select'
  | 'is_required'
  | 'show_in_card'
  | 'sort_order'
>;
type OptionItemRow = Pick<
  TableRow<'option_items'>,
  'id' | 'option_group_id' | 'name' | 'price_delta' | 'sort_order'
>;
type TagRow = Pick<TableRow<'tags'>, 'id' | 'slug' | 'label' | 'emoji' | 'sort_order'>;

export interface SeedMenuVariant {
  id: string;
  menuName: string;
  variantName: string;
  basePrice: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface SeedOptionGroup {
  id: string;
  name: string;
  optionRole: string;
  selectionMode: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  showInCard: boolean;
  sortOrder: number;
  items: {
    id: string;
    name: string;
    priceDelta: number;
    sortOrder: number;
  }[];
}

export interface SeedTag {
  id: string;
  slug: string;
  label: string;
  emoji: string | null;
  sortOrder: number;
}

export interface SeedCatalogData {
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  variants: SeedMenuVariant[];
  optionGroups: SeedOptionGroup[];
  tags: SeedTag[];
}

export async function getSeedCatalogData(): Promise<SeedCatalogData | null> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());

  const { data: brand, error: brandError } = await db
    .from('brands')
    .select<BrandRow>('id, name, slug')
    .eq('slug', 'subway')
    .maybeSingle();

  if (brandError) throw new Error(brandError.message);
  if (!brand) return null;

  const [
    { data: menus, error: menusError },
    { data: variants, error: variantsError },
    { data: groups, error: groupsError },
    { data: items, error: itemsError },
    { data: tags, error: tagsError },
  ] = await Promise.all([
    db
      .from('menus')
      .select<MenuRow>('id, brand_id, name')
      .eq('brand_id', brand.id),
    db
      .from('menu_variants')
      .select<MenuVariantRow>(
        'id, menu_id, name, base_price, is_default, sort_order'
      )
      .order('sort_order', { ascending: true }),
    db
      .from('option_groups')
      .select<OptionGroupRow>(
        'id, brand_id, menu_id, name, option_role, selection_mode, min_select, max_select, is_required, show_in_card, sort_order'
      )
      .eq('brand_id', brand.id)
      .order('sort_order', { ascending: true }),
    db
      .from('option_items')
      .select<OptionItemRow>(
        'id, option_group_id, name, price_delta, sort_order'
      )
      .eq('is_available', true)
      .order('sort_order', { ascending: true }),
    db
      .from('tags')
      .select<TagRow>('id, slug, label, emoji, sort_order')
      .order('sort_order', { ascending: true }),
  ]);

  if (menusError) throw new Error(menusError.message);
  if (variantsError) throw new Error(variantsError.message);
  if (groupsError) throw new Error(groupsError.message);
  if (itemsError) throw new Error(itemsError.message);
  if (tagsError) throw new Error(tagsError.message);

  const menuById = new Map((menus ?? []).map((menu) => [menu.id, menu]));
  const applicableGroups = (groups ?? []).filter(
    (group) => group.menu_id === null || menuById.has(group.menu_id)
  );
  const groupById = new Map(applicableGroups.map((group) => [group.id, group]));
  const itemsByGroupId = new Map<string, OptionItemRow[]>();

  for (const item of items ?? []) {
    if (!groupById.has(item.option_group_id)) continue;
    const groupItems = itemsByGroupId.get(item.option_group_id) ?? [];
    groupItems.push(item);
    itemsByGroupId.set(item.option_group_id, groupItems);
  }

  return {
    brand: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
    },
    variants: (variants ?? [])
      .map((variant) => {
        const menu = menuById.get(variant.menu_id);
        if (!menu) return null;
        return {
          id: variant.id,
          menuName: menu.name,
          variantName: variant.name,
          basePrice: variant.base_price,
          isDefault: variant.is_default,
          sortOrder: variant.sort_order,
        };
      })
      .filter((variant): variant is SeedMenuVariant => variant !== null)
      .sort((a, b) => {
        const menuOrder = a.menuName.localeCompare(b.menuName, 'ko-KR');
        if (menuOrder !== 0) return menuOrder;
        return a.sortOrder - b.sortOrder;
      }),
    optionGroups: applicableGroups.map((group) => ({
      id: group.id,
      name: group.name,
      optionRole: group.option_role,
      selectionMode: group.selection_mode,
      minSelect: group.min_select,
      maxSelect: group.max_select,
      isRequired: group.is_required,
      showInCard: group.show_in_card,
      sortOrder: group.sort_order,
      items: (itemsByGroupId.get(group.id) ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        priceDelta: item.price_delta,
        sortOrder: item.sort_order,
      })),
    })),
    tags: (tags ?? []).map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      label: tag.label,
      emoji: tag.emoji,
      sortOrder: tag.sort_order,
    })),
  };
}
