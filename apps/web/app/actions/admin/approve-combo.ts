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

type PendingComboRow = Pick<
  TableRow<'combos'>,
  'id' | 'brand_id' | 'menu_variant_id' | 'status' | 'title'
>;
type BrandSlugRow = Pick<TableRow<'brands'>, 'slug'>;
type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name' | 'slug'>;
type MenuRow = Pick<TableRow<'menus'>, 'id' | 'brand_id' | 'name'>;
type MenuVariantRow = Pick<
  TableRow<'menu_variants'>,
  'id' | 'menu_id' | 'name' | 'base_price'
>;
type ComboOptionRow = Pick<
  TableRow<'combo_options'>,
  'id' | 'option_group_id' | 'option_item_id' | 'action_type'
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
type ComboTagRow = Pick<TableRow<'combo_tags'>, 'tag_id'>;
type TagRow = Pick<TableRow<'tags'>, 'id' | 'label'>;

type SupportedBrandSlug = 'subway' | 'gongcha' | 'starbucks' | 'cvs';
type ActionType = ComboOption['actionType'];

interface NormalizedOption {
  sourceId: string;
  actionType: ActionType;
  group: OptionGroupRow;
  item: OptionItemRow;
}

const moderationSchema = z.object({
  comboId: uuidSchema,
});

const rejectSchema = moderationSchema.extend({
  reason: z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .min(1, '반려 사유를 입력해 주세요.')
        .max(140, '반려 사유는 140자 이내로 입력해 주세요.')
    ),
});

export async function approveCombo(formData: FormData): Promise<void> {
  await assertActiveAdminUser();
  const parsed = moderationSchema.safeParse({
    comboId: formData.get('comboId'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '조합 ID를 확인해 주세요.');
  }

  const admin = getSupabaseAdminClient();
  const combo = await loadPendingCombo(parsed.data.comboId);
  await claimPendingComboForApproval(combo.id);

  let approvedBrandId = combo.brand_id;
  try {
    const approval = await buildApprovalUpdate(combo);
    approvedBrandId = approval.brandId;
    await rewriteComboOptionSnapshots(combo.id, approval.options);

    const { data: publishedCombo, error } = await admin
      .from('combos')
      .update({
        brand_id: approval.brandId,
        primary_menu_id: approval.menuId,
        menu_variant_id: approval.variantId,
        title: approval.title,
        seed_comment: null,
        card_summary: approval.cardSummary,
        combo_signature: approval.comboSignature,
        estimated_price: approval.estimatedPrice,
        price_status: 'approx',
        search_text: approval.searchText,
        featured_review_id: null,
        status: 'published',
        published_at: new Date().toISOString(),
        rejected_reason: null,
      })
      .eq('id', combo.id)
      .eq('status', 'hidden')
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!publishedCombo) {
      throw new Error('승인 처리 중 조합 상태가 변경되었습니다. 다시 확인해 주세요.');
    }
  } catch (error) {
    await releaseComboApprovalClaim(combo.id);
    throw error;
  }

  await revalidateModerationPaths({ ...combo, brand_id: approvedBrandId });
  redirect('/admin/combos?updated=approved');
}

export async function rejectCombo(formData: FormData): Promise<void> {
  await assertActiveAdminUser();
  const parsed = rejectSchema.safeParse({
    comboId: formData.get('comboId'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
  }

  const admin = getSupabaseAdminClient();
  const combo = await loadPendingCombo(parsed.data.comboId);

  const { data: rejectedCombo, error } = await admin
    .from('combos')
    .update({
      status: 'rejected',
      rejected_reason: parsed.data.reason,
      published_at: null,
    })
    .eq('id', combo.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!rejectedCombo) {
    throw new Error('반려 처리 중 조합 상태가 변경되었습니다. 다시 확인해 주세요.');
  }
  await revalidateModerationPaths(combo);
  redirect('/admin/combos?updated=rejected');
}

async function loadPendingCombo(comboId: string) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data, error } = await db
    .from('combos')
    .select<PendingComboRow>('id, brand_id, menu_variant_id, status, title')
    .eq('id', comboId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('승인 대기 조합을 찾을 수 없습니다.');
  return data;
}

async function claimPendingComboForApproval(comboId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('combos')
    .update({
      status: 'hidden',
      rejected_reason: null,
      published_at: null,
    })
    .eq('id', comboId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('승인 대기 조합을 처리 상태로 전환하지 못했습니다.');
  }
}

async function releaseComboApprovalClaim(comboId: string) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from('combos')
    .update({
      status: 'pending',
      published_at: null,
    })
    .eq('id', comboId)
    .eq('status', 'hidden');

  if (error) {
    console.warn('[approveCombo] approval claim release failed:', error.message);
  }
}

async function buildApprovalUpdate(combo: PendingComboRow) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const title = normalizeTitle(combo.title);

  const { data: variant, error: variantError } = await db
    .from('menu_variants')
    .select<MenuVariantRow>('id, menu_id, name, base_price')
    .eq('id', combo.menu_variant_id)
    .maybeSingle();

  if (variantError) throw new Error(variantError.message);
  if (!variant) throw new Error('조합의 메뉴 변형을 찾을 수 없습니다.');

  const { data: menu, error: menuError } = await db
    .from('menus')
    .select<MenuRow>('id, brand_id, name')
    .eq('id', variant.menu_id)
    .maybeSingle();

  if (menuError) throw new Error(menuError.message);
  if (!menu) throw new Error('조합의 메뉴를 찾을 수 없습니다.');

  const { data: brand, error: brandError } = await db
    .from('brands')
    .select<BrandRow>('id, name, slug')
    .eq('id', menu.brand_id)
    .maybeSingle();

  if (brandError) throw new Error(brandError.message);
  if (!brand) throw new Error('조합의 브랜드를 찾을 수 없습니다.');

  const brandSlug = toSupportedBrandSlug(brand.slug);
  const [optionRows, groups, tags] = await Promise.all([
    loadComboOptions(combo.id),
    loadApplicableGroups(brand.id, menu.id),
    loadComboTags(combo.id),
  ]);

  if (optionRows.length === 0) {
    throw new Error('승인할 조합에 옵션이 없습니다.');
  }

  const optionItemIds = optionRows.map((option) => {
    if (!option.option_item_id || !option.option_group_id) {
      throw new Error('승인할 조합에 원본 옵션 참조가 없는 항목이 있습니다.');
    }
    return option.option_item_id;
  });
  const items = await loadSelectedOptionItems(optionItemIds);
  const normalizedOptions = normalizeOptions({
    brandId: brand.id,
    menuId: menu.id,
    groups,
    items,
    optionRows,
  });

  validateGroupSelection(groups, normalizedOptions);

  const cardOptions = buildCardOptions(normalizedOptions);
  const priceOptions = buildPriceOptions(normalizedOptions);
  const signatureOptions = buildSignatureOptions(normalizedOptions);
  const comboSignature = await buildComboSignature({
    brandId: brand.id,
    menuVariantId: variant.id,
    options: signatureOptions,
  });
  const estimatedPrice = calculateEstimatedPrice({
    menuVariantBasePrice: variant.base_price,
    options: priceOptions,
  });

  return {
    brandId: brand.id,
    menuId: menu.id,
    variantId: variant.id,
    title,
    cardSummary: buildCardSummary({
      brandSlug,
      menuName: menu.name,
      variantName: variant.name,
      options: cardOptions,
    }),
    comboSignature,
    estimatedPrice,
    searchText: buildSearchText({
      title,
      brand,
      menu,
      variant,
      options: normalizedOptions,
      tags,
    }),
    options: normalizedOptions,
  };
}

async function loadComboOptions(comboId: string) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data, error } = await db
    .from('combo_options')
    .select<ComboOptionRow>('id, option_group_id, option_item_id, action_type')
    .eq('combo_id', comboId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
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
  const uniqueIds = [...new Set(optionItemIds)];
  const { data, error } = await db
    .from('option_items')
    .select<OptionItemRow>(
      'id, option_group_id, name, alias_names, price_delta, sort_order'
    )
    .in('id', uniqueIds);

  if (error) throw new Error(error.message);
  if ((data ?? []).length !== uniqueIds.length) {
    throw new Error('승인할 조합에 찾을 수 없는 옵션이 있습니다.');
  }
  return data ?? [];
}

async function loadComboTags(comboId: string) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: comboTags, error: comboTagsError } = await db
    .from('combo_tags')
    .select<ComboTagRow>('tag_id')
    .eq('combo_id', comboId);

  if (comboTagsError) throw new Error(comboTagsError.message);
  const tagIds = [...new Set((comboTags ?? []).map((tag) => tag.tag_id))];
  if (tagIds.length > 5) {
    throw new Error('태그는 최대 5개까지 승인할 수 있습니다.');
  }
  if (tagIds.length === 0) return [];

  const { data: tags, error: tagsError } = await db
    .from('tags')
    .select<TagRow>('id, label')
    .in('id', tagIds);

  if (tagsError) throw new Error(tagsError.message);
  if ((tags ?? []).length !== tagIds.length) {
    throw new Error('승인할 조합에 찾을 수 없는 태그가 있습니다.');
  }
  return tags ?? [];
}

function normalizeOptions(input: {
  brandId: string;
  menuId: string;
  groups: OptionGroupRow[];
  items: OptionItemRow[];
  optionRows: ComboOptionRow[];
}) {
  const groupById = new Map(input.groups.map((group) => [group.id, group]));
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const seenItemIds = new Set<string>();
  const normalized: NormalizedOption[] = [];

  for (const row of input.optionRows) {
    if (!row.option_item_id || !row.option_group_id) {
      throw new Error('승인할 조합에 원본 옵션 참조가 없는 항목이 있습니다.');
    }
    if (seenItemIds.has(row.option_item_id)) {
      throw new Error('승인할 조합에 중복 옵션이 있습니다.');
    }

    const item = itemById.get(row.option_item_id);
    if (!item) throw new Error('승인할 조합에 찾을 수 없는 옵션이 있습니다.');
    if (item.option_group_id !== row.option_group_id) {
      throw new Error('승인할 조합의 옵션 그룹 참조가 일치하지 않습니다.');
    }

    const group = groupById.get(row.option_group_id);
    if (!group) {
      throw new Error('승인할 조합에 현재 메뉴에 적용되지 않는 옵션이 있습니다.');
    }
    if (group.brand_id !== input.brandId) {
      throw new Error('승인할 조합에 현재 브랜드에 속하지 않는 옵션이 있습니다.');
    }
    if (group.menu_id !== null && group.menu_id !== input.menuId) {
      throw new Error('승인할 조합에 현재 메뉴에 적용되지 않는 옵션이 있습니다.');
    }
    if (!isActionType(row.action_type)) {
      throw new Error('승인할 조합에 잘못된 옵션 액션이 있습니다.');
    }

    seenItemIds.add(row.option_item_id);
    normalized.push({ sourceId: row.id, actionType: row.action_type, group, item });
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
      throw new Error(`${group.name} 옵션이 부족해 승인할 수 없습니다.`);
    }
    if (count > group.max_select) {
      throw new Error(`${group.name} 옵션이 너무 많아 승인할 수 없습니다.`);
    }
    if (group.selection_mode === 'single' && count > 1) {
      throw new Error(`${group.name} 옵션은 1개만 승인할 수 있습니다.`);
    }
  }
}

async function rewriteComboOptionSnapshots(
  comboId: string,
  options: NormalizedOption[]
) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());

  await Promise.all(
    options.map((option, index) =>
      db
        .from('combo_options')
        .update({
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
        .eq('id', option.sourceId)
    )
  ).then((results) => {
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
  });
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
  title: string;
  brand: BrandRow;
  menu: MenuRow;
  variant: MenuVariantRow;
  options: NormalizedOption[];
  tags: TagRow[];
}) {
  return [
    input.title,
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

function normalizeTitle(title: string) {
  const normalized = title.normalize('NFC').trim();
  if (!normalized) throw new Error('조합명이 비어 있어 승인할 수 없습니다.');
  if (normalized.length > 60) {
    throw new Error('조합명은 60자 이내만 승인할 수 있습니다.');
  }
  return normalized;
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

function isActionType(value: string): value is ActionType {
  return value === 'select' || value === 'exclude' || value === 'add';
}

async function revalidateModerationPaths(combo: PendingComboRow) {
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: brand } = await db
    .from('brands')
    .select<BrandSlugRow>('slug')
    .eq('id', combo.brand_id)
    .maybeSingle();

  revalidatePath('/admin/combos');
  revalidatePath(`/combo/${combo.id}`);
  if (brand?.slug) revalidatePath(`/brand/${brand.slug}`);
}
