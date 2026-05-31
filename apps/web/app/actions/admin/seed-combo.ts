'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  buildCardSummary,
  buildComboSignature,
  calculateEstimatedPrice,
  type ComboOption,
  type PriceOption,
  type SignatureOption,
} from '@mzr/db';
import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { uuidSchema } from '@/lib/z-schemas/common';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name' | 'slug'>;
type MenuRow = Pick<TableRow<'menus'>, 'id' | 'brand_id' | 'name'>;
type MenuVariantRow = Pick<
  TableRow<'menu_variants'>,
  'id' | 'menu_id' | 'name' | 'base_price'
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
  | 'sort_order'
>;
type OptionItemRow = Pick<
  TableRow<'option_items'>,
  'id' | 'option_group_id' | 'name' | 'alias_names' | 'price_delta' | 'sort_order'
>;
type TagRow = Pick<TableRow<'tags'>, 'id' | 'label' | 'emoji'>;

type SupportedBrandSlug = 'subway' | 'gongcha' | 'starbucks' | 'cvs';
type ActionType = ComboOption['actionType'];

interface OptionSelection {
  optionItemId: string;
  actionType: ActionType;
}

interface NormalizedOption {
  actionType: ActionType;
  group: OptionGroupRow;
  item: OptionItemRow;
}

const actionTypeSchema = z.enum(['select', 'exclude', 'add']);

const normalizedText = (max: number) =>
  z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .min(1, '내용을 입력해 주세요')
        .max(max, `${max}자 이내로 입력해 주세요`)
    );

const seedComboSchema = z.object({
  title: normalizedText(60),
  seedComment: z
    .string()
    .max(140, '140자 이내로 입력해 주세요')
    .transform((value) => {
      const normalized = value.normalize('NFC').trim();
      return normalized.length ? normalized : null;
    }),
  menuVariantId: uuidSchema,
  tagIds: z.array(uuidSchema).max(5, '태그는 최대 5개까지 선택할 수 있습니다.'),
});

export async function createSeedCombo(formData: FormData): Promise<void> {
  const creatorId = await assertActiveAdminUser();
  const parsed = seedComboSchema.safeParse({
    title: formData.get('title'),
    seedComment: formData.get('seedComment') ?? '',
    menuVariantId: formData.get('menuVariantId'),
    tagIds: getStringValues(formData, 'tagIds'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
  }

  const selections = parseOptionSelections(formData);
  if (selections.length === 0) {
    throw new Error('최소 1개 이상의 옵션을 선택해 주세요.');
  }

  const admin = getSupabaseAdminClient();
  const db = asSupabaseQueryClient(admin);

  const { data: variant, error: variantError } = await db
    .from('menu_variants')
    .select<MenuVariantRow>('id, menu_id, name, base_price')
    .eq('id', parsed.data.menuVariantId)
    .maybeSingle();

  if (variantError) throw new Error(variantError.message);
  if (!variant) throw new Error('선택한 메뉴 변형을 찾을 수 없습니다.');

  const { data: menu, error: menuError } = await db
    .from('menus')
    .select<MenuRow>('id, brand_id, name')
    .eq('id', variant.menu_id)
    .maybeSingle();

  if (menuError) throw new Error(menuError.message);
  if (!menu) throw new Error('선택한 메뉴를 찾을 수 없습니다.');

  const { data: brand, error: brandError } = await db
    .from('brands')
    .select<BrandRow>('id, name, slug')
    .eq('id', menu.brand_id)
    .maybeSingle();

  if (brandError) throw new Error(brandError.message);
  if (!brand) throw new Error('선택한 브랜드를 찾을 수 없습니다.');

  const brandSlug = toSupportedBrandSlug(brand.slug);
  const [groups, items, selectedTags] = await Promise.all([
    loadApplicableGroups(brand.id, menu.id),
    loadSelectedOptionItems(selections.map((selection) => selection.optionItemId)),
    loadSelectedTags(parsed.data.tagIds),
  ]);

  const normalizedOptions = normalizeOptions({
    brandId: brand.id,
    menuId: menu.id,
    groups,
    items,
    selections,
  });

  validateGroupSelection(groups, normalizedOptions);

  const cardOptions = buildCardOptions(normalizedOptions);
  const priceOptions = buildPriceOptions(normalizedOptions);
  const signatureOptions = buildSignatureOptions(normalizedOptions);
  const comboId = crypto.randomUUID();
  const comboSignature = await buildComboSignature({
    brandId: brand.id,
    menuVariantId: variant.id,
    options: signatureOptions,
  });
  const estimatedPrice = calculateEstimatedPrice({
    menuVariantBasePrice: variant.base_price,
    options: priceOptions,
  });
  const cardSummary = buildCardSummary({
    brandSlug,
    menuName: menu.name,
    variantName: variant.name,
    options: cardOptions,
  });
  const searchText = buildSearchText({
    brand,
    menu,
    variant,
    options: normalizedOptions,
    tags: selectedTags,
    title: parsed.data.title,
    seedComment: parsed.data.seedComment,
  });

  const comboInsert: TableInsert<'combos'> = {
    id: comboId,
    brand_id: brand.id,
    primary_menu_id: menu.id,
    menu_variant_id: variant.id,
    creator_id: creatorId,
    title: parsed.data.title,
    seed_comment: parsed.data.seedComment,
    card_summary: cardSummary,
    combo_signature: comboSignature,
    estimated_price: estimatedPrice,
    price_status: 'approx',
    search_text: searchText,
    status: 'published',
    published_at: new Date().toISOString(),
  };

  const comboOptions = normalizedOptions.map<TableInsert<'combo_options'>>(
    (option, index) => ({
      combo_id: comboId,
      option_group_id: option.group.id,
      option_item_id: option.item.id,
      action_type: option.actionType,
      group_name_snapshot: option.group.name,
      option_name_snapshot: option.item.name,
      price_delta_snapshot: option.item.price_delta,
      quantity: 1,
      sort_order: index + 1,
    })
  );
  const comboTags = selectedTags.map<TableInsert<'combo_tags'>>((tag) => ({
    combo_id: comboId,
    tag_id: tag.id,
  }));

  const { error: comboInsertError } = await db.from('combos').insert(comboInsert);
  if (comboInsertError) throw new Error(comboInsertError.message);

  try {
    const { error: optionsError } = await db
      .from('combo_options')
      .insert(comboOptions);
    if (optionsError) throw new Error(optionsError.message);

    if (comboTags.length > 0) {
      const { error: tagsError } = await db.from('combo_tags').insert(comboTags);
      if (tagsError) throw new Error(tagsError.message);
    }
  } catch (error) {
    const { error: cleanupError } = await db.from('combos').delete().eq('id', comboId);
    if (cleanupError) {
      console.warn('[createSeedCombo] seed combo cleanup failed:', cleanupError.message);
    }
    throw error;
  }

  revalidatePath(`/brand/${brand.slug}`);
  revalidatePath(`/combo/${comboId}`);
  redirect(`/combo/${comboId}`);
}

async function loadApplicableGroups(brandId: string, menuId: string) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data, error } = await db
    .from('option_groups')
    .select<OptionGroupRow>(
      'id, brand_id, menu_id, name, option_role, selection_mode, min_select, max_select, is_required, sort_order'
    )
    .eq('brand_id', brandId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).filter((group) => group.menu_id === null || group.menu_id === menuId);
}

async function loadSelectedOptionItems(optionItemIds: string[]) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  if (optionItemIds.length === 0) return [];

  const { data, error } = await db
    .from('option_items')
    .select<OptionItemRow>(
      'id, option_group_id, name, alias_names, price_delta, sort_order'
    )
    .in('id', optionItemIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadSelectedTags(tagIds: string[]) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  if (tagIds.length === 0) return [];

  const { data, error } = await db
    .from('tags')
    .select<TagRow>('id, label, emoji')
    .in('id', tagIds);

  if (error) throw new Error(error.message);
  if ((data ?? []).length !== tagIds.length) {
    throw new Error('선택한 태그 중 찾을 수 없는 항목이 있습니다.');
  }
  return data ?? [];
}

function normalizeOptions(input: {
  brandId: string;
  menuId: string;
  groups: OptionGroupRow[];
  items: OptionItemRow[];
  selections: OptionSelection[];
}) {
  const groupById = new Map(input.groups.map((group) => [group.id, group]));
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const normalized: NormalizedOption[] = [];

  for (const selection of input.selections) {
    const item = itemById.get(selection.optionItemId);
    if (!item) throw new Error('선택한 옵션 중 찾을 수 없는 항목이 있습니다.');

    const group = groupById.get(item.option_group_id);
    if (!group) {
      throw new Error('선택한 옵션이 현재 메뉴에 적용되지 않는 그룹에 속해 있습니다.');
    }
    if (group.brand_id !== input.brandId) {
      throw new Error('선택한 옵션이 현재 브랜드에 속하지 않습니다.');
    }
    if (group.menu_id !== null && group.menu_id !== input.menuId) {
      throw new Error('선택한 옵션이 현재 메뉴에 적용되지 않습니다.');
    }

    normalized.push({ actionType: selection.actionType, group, item });
  }

  return normalized.sort((a, b) => {
    const groupOrder = a.group.sort_order - b.group.sort_order;
    if (groupOrder !== 0) return groupOrder;
    return a.item.sort_order - b.item.sort_order;
  });
}

function validateGroupSelection(
  groups: OptionGroupRow[],
  options: NormalizedOption[]
) {
  const countByGroupId = new Map<string, number>();
  for (const option of options) {
    countByGroupId.set(
      option.group.id,
      (countByGroupId.get(option.group.id) ?? 0) + 1
    );
  }

  for (const group of groups) {
    const count = countByGroupId.get(group.id) ?? 0;
    if (group.is_required && count < group.min_select) {
      throw new Error(`${group.name} 옵션을 선택해 주세요.`);
    }
    if (count > group.max_select) {
      throw new Error(`${group.name} 옵션은 최대 ${group.max_select}개까지 선택할 수 있습니다.`);
    }
    if (group.selection_mode === 'single' && count > 1) {
      throw new Error(`${group.name} 옵션은 1개만 선택할 수 있습니다.`);
    }
  }
}

function buildCardOptions(options: NormalizedOption[]): ComboOption[] {
  return options.map((option, index) => ({
    actionType: option.actionType,
    groupName: option.group.name,
    itemName: option.item.name,
    sortOrder: index + 1,
  }));
}

function buildPriceOptions(options: NormalizedOption[]): PriceOption[] {
  return options.map((option) => ({
    actionType: option.actionType,
    priceDelta: option.item.price_delta,
    isSetOption:
      option.group.option_role === 'meta' && option.actionType !== 'exclude',
  }));
}

function buildSignatureOptions(options: NormalizedOption[]): SignatureOption[] {
  return options.map((option) => ({
    actionType: option.actionType,
    optionGroupId: option.group.id,
    optionItemId: option.item.id,
  }));
}

function buildSearchText(input: {
  brand: BrandRow;
  menu: MenuRow;
  variant: MenuVariantRow;
  options: NormalizedOption[];
  tags: TagRow[];
  title: string;
  seedComment: string | null;
}) {
  return [
    input.title,
    input.seedComment,
    input.brand.name,
    input.brand.slug,
    input.menu.name,
    input.variant.name,
    ...input.options.flatMap((option) => [
      option.group.name,
      option.item.name,
      ...option.item.alias_names,
    ]),
    ...input.tags.map((tag) => tag.label),
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFC');
}

function parseOptionSelections(formData: FormData): OptionSelection[] {
  const prefix = 'optionAction:';
  const seen = new Set<string>();
  const selections: OptionSelection[] = [];

  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith(prefix) || typeof rawValue !== 'string') continue;

    const optionItemId = key.slice(prefix.length);
    const actionValue = rawValue.trim();
    if (!actionValue) continue;

    const itemId = uuidSchema.safeParse(optionItemId);
    const actionType = actionTypeSchema.safeParse(actionValue);
    if (!itemId.success || !actionType.success) {
      throw new Error('옵션 입력값을 확인해 주세요.');
    }
    if (seen.has(itemId.data)) {
      throw new Error('같은 옵션이 중복 선택되었습니다.');
    }

    seen.add(itemId.data);
    selections.push({ optionItemId: itemId.data, actionType: actionType.data });
  }

  return selections;
}

function getStringValues(formData: FormData, key: string) {
  return [
    ...new Set(
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === 'string')
    ),
  ];
}

function toSupportedBrandSlug(slug: string): SupportedBrandSlug {
  if (
    slug === 'subway' ||
    slug === 'gongcha' ||
    slug === 'starbucks' ||
    slug === 'cvs'
  ) {
    return slug;
  }
  throw new Error(`지원하지 않는 브랜드입니다: ${slug}`);
}
