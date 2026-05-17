#!/usr/bin/env node

/**
 * Local Supabase DB security invariant audit.
 *
 * This reads Postgres metadata from the local Supabase DB container. It does not
 * write application data and does not require service_role keys.
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

main();

function main() {
  const container = findLocalDbContainer();
  assertExpectedMigrationsApplied(container);

  console.log(`Using local Supabase DB container: ${container}`);

  const checks = [
    {
      name: 'anon cannot INSERT public.events directly',
      actual: sqlScalar(
        container,
        "select has_table_privilege('anon', 'public.events', 'insert')"
      ),
      expected: 'f',
    },
    {
      name: 'authenticated cannot INSERT public.events directly',
      actual: sqlScalar(
        container,
        "select has_table_privilege('authenticated', 'public.events', 'insert')"
      ),
      expected: 'f',
    },
    {
      name: 'anon can execute insert_event RPC',
      actual: sqlScalar(
        container,
        "select has_function_privilege('anon', 'public.insert_event(text,public.events_type,jsonb)', 'execute')"
      ),
      expected: 't',
    },
    {
      name: 'authenticated can execute insert_event RPC',
      actual: sqlScalar(
        container,
        "select has_function_privilege('authenticated', 'public.insert_event(text,public.events_type,jsonb)', 'execute')"
      ),
      expected: 't',
    },
    {
      name: 'anon cannot execute update_combo_stats RPC',
      actual: sqlScalar(
        container,
        "select has_function_privilege('anon', 'public.update_combo_stats(uuid,text,integer)', 'execute')"
      ),
      expected: 'f',
    },
    {
      name: 'authenticated can execute update_combo_stats RPC',
      actual: sqlScalar(
        container,
        "select has_function_privilege('authenticated', 'public.update_combo_stats(uuid,text,integer)', 'execute')"
      ),
      expected: 't',
    },
    {
      name: 'service_role can execute update_combo_stats RPC',
      actual: sqlScalar(
        container,
        "select has_function_privilege('service_role', 'public.update_combo_stats(uuid,text,integer)', 'execute')"
      ),
      expected: 't',
    },
    {
      name: 'events has no INSERT policy',
      actual: sqlScalar(
        container,
        "select count(*) from pg_policies where schemaname = 'public' and tablename = 'events' and cmd = 'INSERT'"
      ),
      expected: '0',
    },
  ];

  const failures = checks.filter((check) => check.actual !== check.expected);
  for (const check of checks) {
    const icon = check.actual === check.expected ? 'ok' : 'fail';
    console.log(`${icon} ${check.name}: ${check.actual}`);
  }

  if (failures.length > 0) {
    console.error('\nDB security audit failed:');
    for (const failure of failures) {
      console.error(
        `- ${failure.name}: expected ${failure.expected}, got ${failure.actual}`
      );
    }
    process.exit(1);
  }

  console.log('\nDB security audit passed.');
}

function findLocalDbContainer() {
  const expectedContainer =
    process.env.SUPABASE_DB_CONTAINER ||
    `supabase_db_${readLocalSupabaseProjectId()}`;
  const result = spawnSync('docker', ['ps', '--format', '{{.Names}}'], {
    encoding: 'utf8',
  });
  if (result.error) {
    throw new Error(`docker 실행 실패: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`docker ps 실패: ${result.stderr.trim()}`);
  }

  const containers = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!containers.includes(expectedContainer)) {
    const candidates = containers
      .filter((name) => name.startsWith('supabase_db_'))
      .join(', ');
    throw new Error(
      [
        `이 repo의 local Supabase DB 컨테이너를 찾을 수 없습니다: ${expectedContainer}`,
        candidates ? `실행 중인 Supabase DB 후보: ${candidates}` : null,
        '현재 repo에서 `supabase start` 또는 `pnpm db:reset`을 실행한 뒤 다시 시도하세요.',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return expectedContainer;
}

function readLocalSupabaseProjectId() {
  let config = '';
  try {
    config = readFileSync(join(process.cwd(), 'supabase', 'config.toml'), 'utf8');
  } catch (error) {
    throw new Error(
      `supabase/config.toml 을 읽을 수 없습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const match = /^\s*project_id\s*=\s*"([^"]+)"\s*$/m.exec(config);
  if (!match?.[1]) {
    throw new Error('supabase/config.toml 에 project_id 가 필요합니다.');
  }
  return match[1];
}

function assertExpectedMigrationsApplied(container) {
  const expectedVersions = readExpectedMigrationVersions();
  if (expectedVersions.length === 0) {
    throw new Error('supabase/migrations 에 적용할 SQL migration 이 없습니다.');
  }

  const appliedVersions = new Set(
    sqlRows(
      container,
      'select version from supabase_migrations.schema_migrations'
    )
  );
  const missing = expectedVersions.filter((version) => !appliedVersions.has(version));

  if (missing.length > 0) {
    throw new Error(
      [
        'local Supabase DB에 현재 repo migration 이 모두 적용되지 않았습니다.',
        `누락된 migration: ${missing.join(', ')}`,
        '`pnpm db:reset` 후 다시 `pnpm audit:db-security`를 실행하세요.',
      ].join('\n')
    );
  }
}

function readExpectedMigrationVersions() {
  return readdirSync(join(process.cwd(), 'supabase', 'migrations'))
    .map((name) => /^(\d{14})_.*\.sql$/.exec(name)?.[1])
    .filter((version) => typeof version === 'string')
    .sort();
}

function sqlScalar(container, sql) {
  const result = spawnSync(
    'docker',
    ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-Atc', sql],
    { encoding: 'utf8' }
  );
  if (result.error) {
    throw new Error(`docker exec 실패: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`SQL 실행 실패: ${result.stderr.trim()}`);
  }

  const lines = parseSqlRows(result.stdout);
  if (lines.length !== 1) {
    throw new Error(`단일 SQL 결과를 기대했지만 ${lines.length}개를 받았습니다: ${sql}`);
  }
  return lines[0];
}

function sqlRows(container, sql) {
  const result = spawnSync(
    'docker',
    ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-Atc', sql],
    { encoding: 'utf8' }
  );
  if (result.error) {
    throw new Error(`docker exec 실패: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`SQL 실행 실패: ${result.stderr.trim()}`);
  }

  return parseSqlRows(result.stdout);
}

function parseSqlRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
