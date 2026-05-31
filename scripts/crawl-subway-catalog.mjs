#!/usr/bin/env node

/**
 * Subway Korea official catalog crawler.
 *
 * This script does not write production catalog tables. It fetches the official
 * Subway pages, compares them with the current Supabase catalog, and writes the
 * existing catalog_change_logs ingest JSON shape. Operators can then run
 * `pnpm catalog:ingest` and approve changes from /admin/catalog-changes.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://www.subway.co.kr';
const DEFAULT_MENU_URL = `${DEFAULT_BASE_URL}/menuList/sandwich`;
const DEFAULT_FRESH_URL = `${DEFAULT_BASE_URL}/freshInfo`;
const DEFAULT_BRAND_SLUG = 'subway';
const DEFAULT_SUBWAY_BRAND_ID = '00000000-0000-0000-0000-000000000001';

const OPTION_GROUPS = {
  bread: { name: '빵 종류', minCount: 5 },
  vegetable: { name: '야채', minCount: 7 },
  cheese: { name: '치즈', minCount: 3 },
  sauce: { name: '소스', minCount: 8 },
};

const MENU_MIN_COUNT = 10;
const FRESH_MIN_COUNT = Object.values(OPTION_GROUPS).reduce(
  (total, group) => total + group.minCount,
  0
);

if (isMainModule()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

function isMainModule() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
}

async function main() {
  loadLocalEnv('.env.local');
  loadLocalEnv('.env');

  const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== '--'));
  if (args.help) {
    printHelp();
    return;
  }

  const startedAt = new Date().toISOString();
  const brand = await loadBrand(args);

  const [menuHtml, freshHtml] = await Promise.all([
    fetchHtml(args.menuUrl),
    fetchHtml(args.freshUrl),
  ]);

  const fetchedMenus = parseSandwichMenus(menuHtml, args.menuUrl);
  const fetchedOptions = parseFreshOptions(freshHtml);
  const selectorErrors = buildSelectorErrors({
    brandId: brand.id,
    fetchedMenus,
    fetchedOptions,
    menuUrl: args.menuUrl,
    freshUrl: args.freshUrl,
    menuMinCount: args.menuMinCount,
    freshMinCount: args.freshMinCount,
  });

  let payload;
  if (selectorErrors.length > 0) {
    payload = {
      sourceName: 'subway_official_catalog',
      status: 'failed',
      fetchedCount: fetchedMenus.length + fetchedOptions.length,
      changes: selectorErrors,
      metadata: {
        startedAt,
        menuUrl: args.menuUrl,
        freshUrl: args.freshUrl,
      },
    };
  } else {
    const catalog = await loadExistingCatalog(brand.id);
    const changes = [
      ...buildMenuChanges({
        brand,
        fetchedMenus,
        existingMenus: catalog.menus,
        includeMissing: args.includeMissing,
      }),
      ...buildOptionChanges({
        brand,
        fetchedOptions,
        optionGroups: catalog.optionGroups,
        optionItems: catalog.optionItems,
        includeMissing: args.includeMissing,
      }),
    ];

    payload = {
      sourceName: 'subway_official_catalog',
      status: 'success',
      fetchedCount: fetchedMenus.length + fetchedOptions.length,
      changes,
      metadata: {
        startedAt,
        menuUrl: args.menuUrl,
        freshUrl: args.freshUrl,
        includeMissing: args.includeMissing,
      },
    };
  }

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (args.output) {
    const absolute = resolve(process.cwd(), args.output);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, json, 'utf8');
  } else {
    process.stdout.write(json);
  }

  printSummary(payload, args.output);
  if (payload.status === 'failed') {
    process.exitCode = 2;
  }
}

function parseArgs(argv) {
  const args = {
    output: '',
    menuUrl: process.env.SUBWAY_MENU_URL || DEFAULT_MENU_URL,
    freshUrl: process.env.SUBWAY_FRESH_URL || DEFAULT_FRESH_URL,
    brandSlug: process.env.SUBWAY_BRAND_SLUG || DEFAULT_BRAND_SLUG,
    brandId: process.env.SUBWAY_BRAND_ID || '',
    includeMissing: false,
    menuMinCount: MENU_MIN_COUNT,
    freshMinCount: FRESH_MIN_COUNT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output' || arg === '-o') {
      args.output = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--menu-url') {
      args.menuUrl = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--fresh-url') {
      args.freshUrl = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--brand-slug') {
      args.brandSlug = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--brand-id') {
      args.brandId = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--include-missing') {
      args.includeMissing = true;
    } else if (arg === '--menu-min-count') {
      args.menuMinCount = toPositiveInteger(argv[index + 1], '--menu-min-count');
      index += 1;
    } else if (arg === '--fresh-min-count') {
      args.freshMinCount = toPositiveInteger(argv[index + 1], '--fresh-min-count');
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`알 수 없는 인자입니다: ${arg}`);
    }
  }

  if (!args.menuUrl) throw new Error('--menu-url 이 필요합니다.');
  if (!args.freshUrl) throw new Error('--fresh-url 이 필요합니다.');
  if (!args.brandSlug && !args.brandId) {
    throw new Error('--brand-slug 또는 --brand-id 가 필요합니다.');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  pnpm catalog:crawl -- --output ./.omc/subway-catalog.json
  pnpm catalog:crawl -- --output ./.omc/subway-catalog.json --include-missing

Then review/import:
  pnpm catalog:ingest -- --file ./.omc/subway-catalog.json --dry-run
  pnpm catalog:ingest -- --file ./.omc/subway-catalog.json

Required env:
  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Default official sources:
  ${DEFAULT_MENU_URL}
  ${DEFAULT_FRESH_URL}`);
}

function toPositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} 은 양의 정수여야 합니다.`);
  }
  return number;
}

async function loadBrand(args) {
  if (args.brandId) {
    return { id: args.brandId, slug: args.brandSlug || DEFAULT_BRAND_SLUG };
  }

  const client = createSupabaseRestClient();
  const rows = await client.request(
    `/brands?select=id,slug&slug=eq.${encodeURIComponent(args.brandSlug)}&limit=1`
  );
  if (rows.length === 0) {
    if (args.brandSlug === DEFAULT_BRAND_SLUG) {
      return { id: DEFAULT_SUBWAY_BRAND_ID, slug: DEFAULT_BRAND_SLUG };
    }
    throw new Error(`브랜드를 찾을 수 없습니다: ${args.brandSlug}`);
  }
  return rows[0];
}

async function loadExistingCatalog(brandId) {
  const client = createSupabaseRestClient();
  const [menus, optionGroups, optionItems] = await Promise.all([
    client.request(
      `/menus?select=id,brand_id,external_id,name,slug,category_kind,status,source_url&brand_id=eq.${encodeURIComponent(
        brandId
      )}`
    ),
    client.request(
      `/option_groups?select=id,brand_id,name,selection_mode,option_role,min_select,max_select,is_required,show_in_card,card_priority,sort_order&brand_id=eq.${encodeURIComponent(
        brandId
      )}`
    ),
    client.request(
      '/option_items?select=id,option_group_id,external_id,name,alias_names,price_delta,is_available,sort_order'
    ),
  ]);

  const groupIds = new Set(optionGroups.map((group) => group.id));
  return {
    menus,
    optionGroups,
    optionItems: optionItems.filter((item) => groupIds.has(item.option_group_id)),
  };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'matjalar-catalog-crawler/0.1 (+https://github.com/DevilgoHeaven/matjalar)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      throw new Error(`${url} 요청 실패: ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseSandwichMenus(html, sourceUrl) {
  const items = [];
  const seen = new Set();

  for (const block of extractListItems(html)) {
    const className = getAttr(block.attrs, 'class') ?? '';
    if (!className.includes('ITEM_SANDWICH.')) continue;
    if (className.includes('ITEM_SANDWICH.TOPPING')) continue;

    const externalId = getAttrFromHtml(block.html, 'data-menuitemidx');
    const name = normalizeText(extractClassText(block.html, 'strong', 'tit'));
    if (!externalId || !name || seen.has(externalId)) continue;
    seen.add(externalId);

    const englishName = normalizeText(extractClassText(block.html, 'span', 'eng'));
    const summary = normalizeText(extractClassText(block.html, 'div', 'summary'));
    items.push({
      externalId,
      name,
      englishName,
      summary,
      categoryKind: 'sandwich',
      status: 'active',
      slug: slugify(englishName || name || `menu-${externalId}`),
      sourceUrl: `${new URL(sourceUrl).origin}/menuView/sandwich?menuItemIdx=${externalId}`,
    });
  }

  return items;
}

export function parseFreshOptions(html) {
  const items = [];
  const seen = new Set();

  for (const block of extractListItems(html)) {
    const className = getAttr(block.attrs, 'class') ?? '';
    const groupKey = Object.keys(OPTION_GROUPS).find((key) =>
      className.split(/\s+/).includes(key)
    );
    if (!groupKey) continue;

    const name = normalizeText(extractClassText(block.html, 'strong', 'tit'));
    if (!name) continue;

    const englishName = normalizeText(extractClassText(block.html, 'span', 'eng'));
    const calories = normalizeText(extractClassText(block.html, 'span', 'cal'));
    const summary = normalizeText(extractClassText(block.html, 'div', 'summary'));
    const externalId = `${groupKey}:${slugify(englishName || name)}`;
    const dedupeKey = `${groupKey}:${compactName(name)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({
      groupKey,
      groupName: OPTION_GROUPS[groupKey].name,
      externalId,
      name,
      englishName,
      calories,
      summary,
    });
  }

  return items;
}

function extractListItems(html) {
  const source = stripHtmlComments(html);
  const items = [];
  const pattern = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    items.push({ attrs: match[1], html: match[2] });
  }
  return items;
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function getAttr(attrs, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, 'i');
  return pattern.exec(attrs)?.[1] ?? null;
}

function getAttrFromHtml(html, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, 'i');
  return pattern.exec(html)?.[1] ?? null;
}

function extractClassText(html, tagName, className) {
  const pattern = new RegExp(
    `<${tagName}\\b(?=[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${escapeRegExp(
      className
    )}\\b)[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    'i'
  );
  return htmlToText(pattern.exec(html)?.[1] ?? '');
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function decodeEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const radix = entity[1]?.toLowerCase() === 'x' ? 16 : 10;
      const raw = entity[1]?.toLowerCase() === 'x' ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(raw, radix);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

export function buildSelectorErrors({
  brandId,
  fetchedMenus,
  fetchedOptions,
  menuUrl,
  freshUrl,
  menuMinCount,
  freshMinCount,
}) {
  const errors = [];
  if (fetchedMenus.length < menuMinCount) {
    errors.push({
      brandId,
      targetType: 'menu',
      externalId: 'subway-menuList-sandwich',
      changeType: 'selector_error',
      beforeData: null,
      afterData: {
        url: menuUrl,
        fetched_count: fetchedMenus.length,
        expected_min_count: menuMinCount,
        reason: 'sandwich menu selector returned too few rows',
      },
    });
  }

  if (fetchedOptions.length < freshMinCount) {
    errors.push({
      brandId,
      targetType: 'option_item',
      externalId: 'subway-freshInfo',
      changeType: 'selector_error',
      beforeData: null,
      afterData: {
        url: freshUrl,
        fetched_count: fetchedOptions.length,
        expected_min_count: freshMinCount,
        reason: 'fresh ingredient selector returned too few rows',
      },
    });
  }

  return errors;
}

export function buildMenuChanges({
  brand,
  fetchedMenus,
  existingMenus,
  includeMissing,
}) {
  const changes = [];
  const existingByExternal = new Map(
    existingMenus
      .filter((menu) => menu.external_id)
      .map((menu) => [String(menu.external_id), menu])
  );
  const existingByName = new Map(
    existingMenus.map((menu) => [compactName(menu.name), menu])
  );
  const seenIds = new Set();
  const seenExternalIds = new Set();

  for (const [index, item] of fetchedMenus.entries()) {
    const existingByNameCandidate = existingByName.get(compactName(item.name));
    const existing =
      existingByExternal.get(item.externalId) ??
      (existingByNameCandidate && !seenIds.has(existingByNameCandidate.id)
        ? existingByNameCandidate
        : null);
    if (existing?.id) seenIds.add(existing.id);
    seenExternalIds.add(item.externalId);

    const afterData = removeUndefined({
      id: existing?.id,
      brand_id: brand.id,
      external_id: item.externalId,
      name: item.name,
      slug: item.slug,
      category_kind: item.categoryKind,
      status: item.status,
      source_url: item.sourceUrl,
      sort_order: (index + 1) * 10,
      english_name: item.englishName || undefined,
      summary: item.summary || undefined,
    });

    if (!existing) {
      changes.push({
        brandId: brand.id,
        targetType: 'menu',
        externalId: item.externalId,
        changeType: 'created',
        beforeData: null,
        afterData,
      });
      continue;
    }

    const beforeData = pickMenu(existing);
    if (hasTrackedChange(beforeData, afterData, [
      'external_id',
      'name',
      'slug',
      'category_kind',
      'status',
      'source_url',
    ])) {
      changes.push({
        brandId: brand.id,
        targetType: 'menu',
        externalId: item.externalId,
        changeType: 'updated',
        beforeData,
        afterData,
      });
    }
  }

  if (includeMissing) {
    for (const existing of existingMenus) {
      if (existing.category_kind !== 'sandwich') continue;
      if (existing.status === 'discontinued') continue;
      if (seenIds.has(existing.id)) continue;
      if (existing.external_id && seenExternalIds.has(String(existing.external_id))) continue;

      changes.push({
        brandId: brand.id,
        targetType: 'menu',
        externalId: existing.external_id,
        changeType: 'missing',
        beforeData: pickMenu(existing),
        afterData: null,
      });
    }
  }

  return changes;
}

export function buildOptionChanges({
  brand,
  fetchedOptions,
  optionGroups,
  optionItems,
  includeMissing,
}) {
  const changes = [];
  const groupByName = new Map(optionGroups.map((group) => [group.name, group]));
  const itemsByGroup = new Map();
  for (const item of optionItems) {
    if (!itemsByGroup.has(item.option_group_id)) itemsByGroup.set(item.option_group_id, []);
    itemsByGroup.get(item.option_group_id).push(item);
  }

  const seenItemIds = new Set();
  const monitoredGroupIds = new Set();

  for (const [index, item] of fetchedOptions.entries()) {
    const group = groupByName.get(item.groupName);
    if (!group) {
      changes.push({
        brandId: brand.id,
        targetType: 'option_group',
        externalId: item.groupKey,
        changeType: 'selector_error',
        beforeData: null,
        afterData: {
          group_name: item.groupName,
          reason: 'matching option_group row was not found',
        },
      });
      continue;
    }

    monitoredGroupIds.add(group.id);
    const existing = findExistingOptionItem(itemsByGroup.get(group.id) ?? [], item);
    if (existing?.id) seenItemIds.add(existing.id);

    const afterData = removeUndefined({
      id: existing?.id,
      option_group_id: group.id,
      external_id: item.externalId,
      name: item.name,
      alias_names: existing?.alias_names ?? [],
      price_delta: existing?.price_delta ?? 0,
      is_available: true,
      sort_order: existing?.sort_order ?? (index + 1) * 10,
      english_name: item.englishName || undefined,
      calories: item.calories || undefined,
      summary: item.summary || undefined,
    });

    if (!existing) {
      changes.push({
        brandId: brand.id,
        targetType: 'option_item',
        externalId: item.externalId,
        changeType: 'created',
        beforeData: null,
        afterData,
      });
      continue;
    }

    const beforeData = pickOptionItem(existing);
    if (hasTrackedChange(beforeData, afterData, [
      'external_id',
      'name',
      'alias_names',
      'price_delta',
      'is_available',
      'sort_order',
    ])) {
      changes.push({
        brandId: brand.id,
        targetType: 'option_item',
        externalId: item.externalId,
        changeType: 'updated',
        beforeData,
        afterData,
      });
    }
  }

  if (includeMissing) {
    for (const item of optionItems) {
      if (!monitoredGroupIds.has(item.option_group_id)) continue;
      if (!item.is_available) continue;
      if (seenItemIds.has(item.id)) continue;

      changes.push({
        brandId: brand.id,
        targetType: 'option_item',
        externalId: item.external_id,
        changeType: 'missing',
        beforeData: pickOptionItem(item),
        afterData: null,
      });
    }
  }

  return changes;
}

function findExistingOptionItem(items, fetched) {
  const fetchedName = compactName(fetched.name);
  const fetchedExternal = compactName(fetched.externalId);
  return (
    items.find((item) => item.external_id && compactName(item.external_id) === fetchedExternal) ??
    items.find((item) => compactName(item.name) === fetchedName) ??
    items.find((item) =>
      Array.isArray(item.alias_names)
        ? item.alias_names.some((alias) => compactName(alias) === fetchedName)
        : false
    ) ??
    null
  );
}

function pickMenu(menu) {
  return removeUndefined({
    id: menu.id,
    brand_id: menu.brand_id,
    external_id: menu.external_id,
    name: menu.name,
    slug: menu.slug,
    category_kind: menu.category_kind,
    status: menu.status,
    source_url: menu.source_url,
  });
}

function pickOptionItem(item) {
  return removeUndefined({
    id: item.id,
    option_group_id: item.option_group_id,
    external_id: item.external_id,
    name: item.name,
    alias_names: item.alias_names ?? [],
    price_delta: item.price_delta,
    is_available: item.is_available,
    sort_order: item.sort_order,
  });
}

function hasTrackedChange(beforeData, afterData, fields) {
  return fields.some(
    (field) =>
      stableStringify(beforeData[field] ?? null) !==
      stableStringify(afterData[field] ?? null)
  );
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
}

function compactName(value) {
  return normalizeText(String(value ?? ''))
    .toLowerCase()
    .replace(/[\s·ㆍ&._™'’()\-]/g, '');
}

function slugify(value) {
  const slug = normalizeText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSupabaseRestClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL 이 필요합니다.');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.');

  const baseUrl = `${url.replace(/\/$/, '')}/rest/v1`;
  return {
    async request(path, options = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${options.method ?? 'GET'} ${path} 실패: ${response.status} ${body}`);
      }
      if (response.status === 204) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
  };
}

function printSummary(payload, output) {
  const byType = payload.changes.reduce((acc, change) => {
    const key = `${change.targetType}:${change.changeType}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.error(
    JSON.stringify(
      {
        output: output || 'stdout',
        status: payload.status,
        fetchedCount: payload.fetchedCount,
        detectedChanges: payload.changes.length,
        byType,
      },
      null,
      2
    )
  );
}

function loadLocalEnv(filePath) {
  let text = '';
  try {
    text = readFileSync(resolve(process.cwd(), filePath), 'utf8');
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
