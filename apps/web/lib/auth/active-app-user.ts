import 'server-only';

import type { Database } from '@mzr/db';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ensureAppUserExists } from './ensure-app-user';

type AppUserStatusRow = Pick<
  Database['public']['Tables']['app_users']['Row'],
  'status'
>;

export async function isCurrentAppUserActive(): Promise<boolean> {
  const ensured = await ensureAppUserExists();
  if (!ensured) return false;

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await db
    .from('app_users')
    .select<AppUserStatusRow>('status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[isCurrentAppUserActive] app_users 조회 실패:', error.message);
    return false;
  }

  return data?.status === 'active';
}

