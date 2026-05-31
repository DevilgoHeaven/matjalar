'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { uuidSchema } from '@/lib/z-schemas/common';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type AppUserRow = Pick<TableRow<'app_users'>, 'id' | 'role' | 'status'>;

const userActionSchema = z.object({
  userId: uuidSchema,
});

export async function suspendUser(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const userId = parseUserId(formData);
  const target = await loadManagedUser(userId, adminUserId);

  if (target.status !== 'active') {
    throw new Error('active 상태인 유저만 정지할 수 있습니다.');
  }

  await updateUserStatus(userId, 'active', 'suspended');
  revalidatePath('/admin/users');
  redirect('/admin/users?updated=suspended');
}

export async function activateUser(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const userId = parseUserId(formData);
  const target = await loadManagedUser(userId, adminUserId);

  if (target.status !== 'suspended') {
    throw new Error('suspended 상태인 유저만 활성화할 수 있습니다.');
  }

  await updateUserStatus(userId, 'suspended', 'active');
  revalidatePath('/admin/users');
  redirect('/admin/users?updated=active');
}

function parseUserId(formData: FormData) {
  const parsed = userActionSchema.safeParse({
    userId: formData.get('userId'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '유저 ID를 확인해 주세요.');
  }
  return parsed.data.userId;
}

async function loadManagedUser(userId: string, adminUserId: string) {
  if (userId === adminUserId) {
    throw new Error('현재 관리자 계정은 이 화면에서 상태를 변경할 수 없습니다.');
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('app_users')
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle<AppUserRow>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('유저를 찾을 수 없습니다.');
  if (data.role === 'admin') {
    throw new Error('관리자 계정은 이 화면에서 상태를 변경할 수 없습니다.');
  }
  return data;
}

async function updateUserStatus(
  userId: string,
  fromStatus: 'active' | 'suspended',
  toStatus: 'active' | 'suspended'
) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('app_users')
    .update({ status: toStatus })
    .eq('id', userId)
    .eq('status', fromStatus)
    .neq('role', 'admin')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('유저 상태가 이미 변경되었거나 찾을 수 없습니다.');
  }
}
