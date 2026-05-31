/**
 * ⚠️ ADMIN-ONLY ⚠️ — service_role 키 사용 (R-04)
 *
 * 본 모듈은 /admin 라우트 또는 /actions/admin/** 경로에서만 import 가능.
 * eslint no-restricted-imports 가 다른 경로에서의 import 를 차단함.
 * 빌드 후 클라이언트 청크 grep 검사로 누출 여부 검증 (scripts/audit-service-role.mjs).
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@mzr/db';

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 미설정. /admin 액션 호출 전에 환경변수 확인 필요.'
    );
  }
  return createClient<Database>(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
