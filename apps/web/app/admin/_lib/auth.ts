import 'server-only';

import type { Database } from '@mzr/db';
import { ensureAppUserExists } from '@/lib/auth/ensure-app-user';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type AdminUserRow = Pick<
  Database['public']['Tables']['app_users']['Row'],
  'role' | 'status'
>;

export async function assertActiveAdminUser(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('관리자 로그인이 필요합니다.');

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (parseAdminClaim(session?.access_token ?? null) !== 'true') {
    throw new Error('관리자 권한이 필요합니다.');
  }

  await ensureAppUserExists();

  const admin = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data, error } = await admin
    .from('app_users')
    .select<AdminUserRow>('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.role !== 'admin' || data.status !== 'active') {
    throw new Error('현재 관리자 권한이 유효하지 않습니다.');
  }

  return user.id;
}

function parseAdminClaim(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString();
    const claims = JSON.parse(decoded) as Record<string, unknown>;
    return typeof claims.is_admin === 'string' ? claims.is_admin : null;
  } catch {
    return null;
  }
}

