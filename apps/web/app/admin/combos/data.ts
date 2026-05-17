import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ComboRow = Pick<
  TableRow<'combos'>,
  | 'id'
  | 'title'
  | 'card_summary'
  | 'estimated_price'
  | 'created_at'
  | 'brand_id'
  | 'primary_menu_id'
  | 'creator_id'
>;
type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name' | 'slug'>;
type MenuRow = Pick<TableRow<'menus'>, 'id' | 'name'>;
type AppUserRow = Pick<TableRow<'app_users'>, 'id' | 'nickname'>;
type OptionRow = Pick<
  TableRow<'combo_options'>,
  'combo_id' | 'group_name_snapshot' | 'option_name_snapshot' | 'action_type'
>;

export interface PendingComboForAdmin {
  id: string;
  title: string;
  cardSummary: string;
  estimatedPrice: number;
  createdAt: string;
  brand: {
    name: string;
    slug: string;
  };
  menuName: string;
  creatorNickname: string;
  options: string[];
}

export async function getPendingCombos(): Promise<PendingComboForAdmin[]> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: combos, error: combosError } = await db
    .from('combos')
    .select<ComboRow>(
      'id, title, card_summary, estimated_price, created_at, brand_id, primary_menu_id, creator_id'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (combosError) throw new Error(combosError.message);
  const comboRows = combos ?? [];
  if (comboRows.length === 0) return [];

  const brandIds = [...new Set(comboRows.map((combo) => combo.brand_id))];
  const menuIds = [...new Set(comboRows.map((combo) => combo.primary_menu_id))];
  const creatorIds = [
    ...new Set(comboRows.map((combo) => combo.creator_id).filter(Boolean)),
  ] as string[];
  const comboIds = comboRows.map((combo) => combo.id);

  const [
    { data: brands, error: brandsError },
    { data: menus, error: menusError },
    { data: creators, error: creatorsError },
    { data: options, error: optionsError },
  ] = await Promise.all([
    db.from('brands').select<BrandRow>('id, name, slug').in('id', brandIds),
    db.from('menus').select<MenuRow>('id, name').in('id', menuIds),
    creatorIds.length
      ? db
          .from('app_users')
          .select<AppUserRow>('id, nickname')
          .in('id', creatorIds)
      : Promise.resolve({ data: [], error: null }),
    db
      .from('combo_options')
      .select<OptionRow>(
        'combo_id, group_name_snapshot, option_name_snapshot, action_type'
      )
      .in('combo_id', comboIds)
      .order('sort_order', { ascending: true }),
  ]);

  if (brandsError) throw new Error(brandsError.message);
  if (menusError) throw new Error(menusError.message);
  if (creatorsError) throw new Error(creatorsError.message);
  if (optionsError) throw new Error(optionsError.message);

  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand]));
  const menuById = new Map((menus ?? []).map((menu) => [menu.id, menu]));
  const creatorById = new Map(
    (creators ?? []).map((creator) => [creator.id, creator])
  );
  const optionsByComboId = new Map<string, string[]>();

  for (const option of options ?? []) {
    const optionLabel =
      option.action_type === 'exclude'
        ? `${option.group_name_snapshot}: ${option.option_name_snapshot} 빼기`
        : `${option.group_name_snapshot}: ${option.option_name_snapshot}`;
    const list = optionsByComboId.get(option.combo_id) ?? [];
    list.push(optionLabel);
    optionsByComboId.set(option.combo_id, list);
  }

  return comboRows.map((combo) => {
    const brand = brandById.get(combo.brand_id);
    const menu = menuById.get(combo.primary_menu_id);
    const creator = combo.creator_id ? creatorById.get(combo.creator_id) : null;

    return {
      id: combo.id,
      title: combo.title,
      cardSummary: combo.card_summary,
      estimatedPrice: combo.estimated_price,
      createdAt: combo.created_at,
      brand: {
        name: brand?.name ?? '브랜드 미상',
        slug: brand?.slug ?? '',
      },
      menuName: menu?.name ?? '메뉴 미상',
      creatorNickname: creator?.nickname ?? '알 수 없음',
      options: (optionsByComboId.get(combo.id) ?? []).slice(0, 8),
    };
  });
}
