#!/usr/bin/env node

/**
 * catalog_change_logs JSON 인입 CLI.
 *
 * 실제 크롤러는 공식 사이트 HTML 변화와 가격 검증 리스크가 있어 별도 단계로 두고,
 * 크롤러 산출물을 승인 큐에 안전하게 넣는 경로를 먼저 고정한다.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET_TYPES = new Set(['menu', 'option_group', 'option_item', 'menu_variant']);
const CHANGE_TYPES = new Set(['created', 'updated', 'missing', 'selector_error']);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  loadLocalEnv('.env.local');
  loadLocalEnv('.env');

  const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== '--'));
  if (args.help || !args.file) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const input = readInput(args.file);
  const payload = normalizePayload(input);
  const changes = payload.changes.map((change) => ({
    ...change,
    dedupe_key: buildDedupeKey(payload.sourceName, change),
  }));

  if (args.dryRun) {
    printSummary({ payload, changes, inserted: 0, skipped: 0, dryRun: true });
    return;
  }

  const client = createSupabaseRestClient();
  const run = await createCrawlerRun(client, payload);
  let inserted = 0;
  let skipped = 0;

  try {
    for (const change of changes) {
      const didInsert = await insertChangeIfNew(client, run.id, change);
      if (didInsert) inserted += 1;
      else skipped += 1;
    }

    await updateCrawlerRun(client, run.id, {
      status: payload.status,
      finished_at: new Date().toISOString(),
      fetched_count: payload.fetchedCount,
      changed_count: changes.length,
      error_message: null,
    });
    printSummary({ payload, changes, inserted, skipped, dryRun: false });
  } catch (error) {
    await updateCrawlerRun(client, run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      fetched_count: payload.fetchedCount,
      changed_count: changes.length,
      error_message: String(error instanceof Error ? error.message : error).slice(0, 1000),
    });
    throw error;
  }
}

function parseArgs(argv) {
  const args = { file: '', dryRun: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file' || arg === '-f') {
      args.file = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (!args.file) {
      args.file = arg;
    } else {
      throw new Error(`알 수 없는 인자입니다: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  pnpm catalog:ingest -- --file ./catalog-change.sample.json
  pnpm catalog:ingest -- --file ./catalog-change.sample.json --dry-run

Required env:
  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY`);
}

function readInput(filePath) {
  const absolute = resolve(process.cwd(), filePath);
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function normalizePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('입력 JSON은 객체여야 합니다.');
  }
  const sourceName = normalizeText(input.sourceName, 'sourceName');
  const status = input.status ?? 'success';
  if (!['success', 'failed', 'partial'].includes(status)) {
    throw new Error('status 는 success, failed, partial 중 하나여야 합니다.');
  }
  const fetchedCount = toNonNegativeInteger(input.fetchedCount ?? 0, 'fetchedCount');
  if (!Array.isArray(input.changes)) {
    throw new Error('changes 배열이 필요합니다.');
  }

  return {
    sourceName,
    status,
    fetchedCount,
    changes: input.changes.map(normalizeChange),
  };
}

function normalizeChange(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`changes[${index}] 는 객체여야 합니다.`);
  }
  const targetType = normalizeText(raw.targetType, `changes[${index}].targetType`);
  const changeType = normalizeText(raw.changeType, `changes[${index}].changeType`);
  if (!TARGET_TYPES.has(targetType)) {
    throw new Error(`지원하지 않는 targetType 입니다: ${targetType}`);
  }
  if (!CHANGE_TYPES.has(changeType)) {
    throw new Error(`지원하지 않는 changeType 입니다: ${changeType}`);
  }

  return {
    brand_id: optionalString(raw.brandId),
    target_type: targetType,
    external_id: optionalString(raw.externalId),
    change_type: changeType,
    before_data: normalizeJson(raw.beforeData ?? null),
    after_data: normalizeJson(raw.afterData ?? null),
  };
}

function normalizeText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} 문자열이 필요합니다.`);
  }
  return value.normalize('NFC').trim();
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.normalize('NFC').trim() : null;
}

function normalizeJson(value) {
  if (value === undefined) return null;
  JSON.stringify(value);
  return value;
}

function toNonNegativeInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${fieldName} 은 0 이상의 정수여야 합니다.`);
  }
  return number;
}

function buildDedupeKey(sourceName, change) {
  return createHash('sha256')
    .update(
      stableStringify({
        sourceName,
        brand_id: change.brand_id,
        target_type: change.target_type,
        external_id: change.external_id,
        change_type: change.change_type,
        before_data: change.before_data,
        after_data: change.after_data,
      })
    )
    .digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`;
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

async function createCrawlerRun(client, payload) {
  const rows = await client.request('/crawler_runs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      source_name: payload.sourceName,
      status: 'running',
      fetched_count: payload.fetchedCount,
      changed_count: payload.changes.length,
    }),
  });
  return rows[0];
}

async function updateCrawlerRun(client, runId, patch) {
  await client.request(`/crawler_runs?id=eq.${encodeURIComponent(runId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
}

async function insertChangeIfNew(client, crawlerRunId, change) {
  const existing = await client.request(
    `/catalog_change_logs?select=id&status=eq.pending&dedupe_key=eq.${encodeURIComponent(
      change.dedupe_key
    )}&limit=1`
  );
  if (existing.length > 0) return false;

  try {
    await client.request('/catalog_change_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        crawler_run_id: crawlerRunId,
        ...change,
      }),
    });
    return true;
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes('23505')) {
      return false;
    }
    throw error;
  }
}

function printSummary({ payload, changes, inserted, skipped, dryRun }) {
  const byType = changes.reduce((acc, change) => {
    const key = `${change.target_type}:${change.change_type}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    JSON.stringify(
      {
        dryRun,
        sourceName: payload.sourceName,
        status: payload.status,
        fetchedCount: payload.fetchedCount,
        detectedChanges: changes.length,
        inserted,
        skipped,
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
