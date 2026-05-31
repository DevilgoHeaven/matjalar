#!/usr/bin/env node
/**
 * service_role 키 누출 검사 (R-04 완화)
 *
 * 빌드 후 클라이언트 청크에 'SERVICE_ROLE' 또는 'service_role' 문자열이 등장하면 실패.
 * 단, @supabase/auth-js 가 클라이언트 번들에 포함하는 주석형 경고 문구는
 * 실제 키·환경변수 노출이 아니므로 알려진 safe snippet 으로 제외한다.
 *
 * 사용법:
 *   pnpm build
 *   node ./scripts/audit-service-role.mjs
 *   (또는 pnpm audit:service-role)
 *
 * exit code:
 *   0: 안전
 *   1: 누출 의심 (즉시 수정)
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLIENT_DIRS = [
  'apps/web/.next/static',
  'apps/web/.next/server/app', // page.client.* 만 검사
];
const FORBIDDEN = /SERVICE_ROLE|service_role/;
const KNOWN_SAFE_SNIPPETS = [
  'Never expose your `service_role` key in the browser.',
  'Requires a `service_role` key.',
];

/**
 * 디렉터리를 재귀 순회하며 .js / .mjs / .json 파일 경로를 yield
 */
async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // 디렉터리 없음 (빌드 안 됨 등) — 통과
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (/\.(js|mjs|json)$/.test(entry.name)) {
      yield fullPath;
    }
  }
}

let leakCount = 0;
const leakedFiles = [];

for (const dir of CLIENT_DIRS) {
  for await (const file of walk(dir)) {
    // server/app 안에서는 page.client.* 만 클라이언트 청크
    if (
      dir.includes('.next/server/app') &&
      !/page\.client/.test(file)
    ) {
      continue;
    }
    const content = await readFile(file, 'utf8');
    const suspiciousLines = content
      .split(/\r?\n/)
      .filter((line) => FORBIDDEN.test(line))
      .filter(
        (line) => !KNOWN_SAFE_SNIPPETS.some((snippet) => line.includes(snippet))
      );
    if (suspiciousLines.length > 0) {
      leakCount++;
      leakedFiles.push(file);
    }
  }
}

if (leakCount > 0) {
  console.error('❌ service_role 키 누출 의심:');
  for (const file of leakedFiles) {
    console.error(`  - ${file}`);
  }
  console.error('\n원인 점검:');
  console.error('  1. NEXT_PUBLIC_ prefix 가 SUPABASE_SERVICE_ROLE_KEY 에 붙어있는지');
  console.error('  2. lib/supabase/admin.ts 가 클라이언트 컴포넌트에서 import 되고 있는지');
  console.error('  3. Server Action 파일에 "use server" 가 누락되어 있는지');
  process.exit(1);
}

console.log('✅ 클라이언트 청크에 service_role 키 노출 없음.');
