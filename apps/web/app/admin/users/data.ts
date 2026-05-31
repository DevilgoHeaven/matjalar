import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type AppUserRow = Pick<
  TableRow<'app_users'>,
  'id' | 'nickname' | 'avatar_url' | 'role' | 'status' | 'created_at'
>;

export interface AdminUserRow {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  isSelf: boolean;
  canSuspend: boolean;
  canActivate: boolean;
}

/**
 * 관리자 유저 정지 화면에 필요한 최근 가입 사용자 목록.
 */
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const currentAdminId = await assertActiveAdminUser();
  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data, error } = await db
    .from('app_users')
    .select<AppUserRow>('id, nickname, avatar_url, role, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((user) => {
    const isSelf = user.id === currentAdminId;
    const isAdmin = user.role === 'admin';
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      isSelf,
      canSuspend: !isSelf && !isAdmin && user.status === 'active',
      canActivate: !isSelf && !isAdmin && user.status === 'suspended',
    };
  });
}
