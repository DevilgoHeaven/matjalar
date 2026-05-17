#!/usr/bin/env node

/**
 * Send a catalog crawler run summary to a Discord incoming webhook.
 *
 * The webhook URL is read from DISCORD_WEBHOOK_URL. Missing webhook config is a
 * no-op so the same script can run in local shells and GitHub Actions.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_FIELD_VALUE = 1000;
const WEBHOOK_TIMEOUT_MS = 10_000;

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

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('DISCORD_WEBHOOK_URL is not set; skipping Discord notification.');
    return;
  }

  const payload = buildDiscordPayload({
    catalogPayload: readCatalogPayload(args.file),
    crawlExitCode: args.crawlExitCode,
    ingestExitCode: args.ingestExitCode,
    runUrl: args.runUrl || buildGitHubRunUrl(process.env),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${body}`);
  }

  console.log('Discord notification sent.');
}

function parseArgs(argv) {
  const args = {
    file: '',
    crawlExitCode: null,
    ingestExitCode: null,
    runUrl: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file' || arg === '-f') {
      args.file = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--crawl-exit-code') {
      args.crawlExitCode = toInteger(argv[index + 1], '--crawl-exit-code');
      index += 1;
    } else if (arg === '--ingest-exit-code') {
      args.ingestExitCode = toInteger(argv[index + 1], '--ingest-exit-code');
      index += 1;
    } else if (arg === '--run-url') {
      args.runUrl = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`알 수 없는 인자입니다: ${arg}`);
    }
  }

  if (!args.help && !args.file) {
    throw new Error('--file 이 필요합니다.');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  pnpm catalog:notify -- --file ./.omc/subway-catalog.json
  pnpm catalog:notify -- --file ./.omc/subway-catalog.json --crawl-exit-code 0 --ingest-exit-code 0

Required env:
  DISCORD_WEBHOOK_URL`);
}

function readCatalogPayload(filePath) {
  const absolute = resolve(process.cwd(), filePath);
  try {
    return JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    return {
      sourceName: 'subway_official_catalog',
      status: 'failed',
      fetchedCount: 0,
      changes: [
        {
          targetType: 'crawler',
          externalId: filePath,
          changeType: 'failed',
          afterData: {
            reason:
              error instanceof Error
                ? error.message
                : 'crawler output could not be read',
          },
        },
      ],
    };
  }
}

function toInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`${fieldName} 은 정수여야 합니다.`);
  }
  return number;
}

export function buildDiscordPayload({
  catalogPayload,
  crawlExitCode,
  ingestExitCode,
  runUrl,
}) {
  const changes = Array.isArray(catalogPayload?.changes)
    ? catalogPayload.changes
    : [];
  const byType = summarizeChanges(changes);
  const hasFailure =
    catalogPayload?.status === 'failed' ||
    (crawlExitCode !== null && crawlExitCode !== 0) ||
    (ingestExitCode !== null && ingestExitCode !== 0);
  const title = hasFailure
    ? '맛잘알 catalog crawler failed'
    : '맛잘알 catalog crawler completed';

  const lines = [
    `source: ${safeText(catalogPayload?.sourceName ?? 'unknown')}`,
    `status: ${safeText(catalogPayload?.status ?? 'unknown')}`,
    `fetched: ${safeText(catalogPayload?.fetchedCount ?? 0)}`,
    `changes: ${changes.length}`,
    crawlExitCode === null ? null : `crawl_exit: ${crawlExitCode}`,
    ingestExitCode === null ? null : `ingest_exit: ${ingestExitCode}`,
    runUrl ? `run: ${runUrl}` : null,
  ].filter(Boolean);

  const fields = [
    {
      name: 'Changes by type',
      value: truncate(
        Object.keys(byType).length
          ? Object.entries(byType)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, count]) => `${key}: ${count}`)
              .join('\n')
          : 'none'
      ),
      inline: false,
    },
  ];

  const selectorErrors = changes.filter(
    (change) => change?.changeType === 'selector_error'
  );
  if (selectorErrors.length > 0) {
    fields.push({
      name: 'Selector errors',
      value: truncate(
        selectorErrors
          .map((change) => {
            const reason = change?.afterData?.reason ?? 'unknown reason';
            return `${change.targetType}:${change.externalId ?? '-'} - ${reason}`;
          })
          .join('\n')
      ),
      inline: false,
    });
  }

  return {
    username: 'matjalar catalog bot',
    embeds: [
      {
        title,
        description: lines.join('\n'),
        color: hasFailure ? 0xdc2626 : 0x16a34a,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function summarizeChanges(changes) {
  return changes.reduce((acc, change) => {
    const targetType = safeText(change?.targetType ?? change?.target_type ?? 'unknown');
    const changeType = safeText(change?.changeType ?? change?.change_type ?? 'unknown');
    const key = `${targetType}:${changeType}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildGitHubRunUrl(env) {
  if (!env.GITHUB_SERVER_URL || !env.GITHUB_REPOSITORY || !env.GITHUB_RUN_ID) {
    return '';
  }
  return `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
}

function safeText(value) {
  return String(value ?? '').normalize('NFC').trim();
}

function truncate(value) {
  if (value.length <= MAX_FIELD_VALUE) return value;
  return `${value.slice(0, MAX_FIELD_VALUE - 3)}...`;
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
