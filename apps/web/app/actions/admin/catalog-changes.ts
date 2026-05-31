'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { uuidSchema } from '@/lib/z-schemas/common';

interface ApprovedCatalogChange {
  change_id: string;
  target_type: string;
  change_type: string;
  affected_brand_id: string | null;
}

const changeActionSchema = z.object({
  changeId: uuidSchema,
});

/**
 * pending 카탈로그 변경을 production 카탈로그에 반영하고 approved 로 닫는다.
 * 실제 적용은 DB RPC 한 트랜잭션에서 수행해 로그 상태와 카탈로그 변경이 어긋나지 않게 한다.
 */
export async function approveCatalogChange(formData: FormData): Promise<void> {
  await assertActiveAdminUser();
  const changeId = parseChangeId(formData);
  const admin = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data, error } = await admin.rpc<ApprovedCatalogChange[]>(
    'approve_catalog_change',
    { p_change: changeId }
  );

  if (error) throw new Error(error.message);

  revalidatePath('/admin/catalog-changes');
  revalidatePath('/admin/seed');
  revalidatePath('/brand/subway');

  const approved = data?.[0];
  if (approved?.target_type === 'menu' || approved?.target_type === 'menu_variant') {
    revalidatePath('/combo/new');
  }

  redirect('/admin/catalog-changes?updated=approved');
}

/**
 * production 반영이 필요 없거나 위험한 변경을 ignored 로 닫는다.
 */
export async function ignoreCatalogChange(formData: FormData): Promise<void> {
  await assertActiveAdminUser();
  const changeId = parseChangeId(formData);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('catalog_change_logs')
    .update({ status: 'ignored' })
    .eq('id', changeId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('카탈로그 변경이 이미 처리되었거나 찾을 수 없습니다.');
  }

  revalidatePath('/admin/catalog-changes');
  redirect('/admin/catalog-changes?updated=ignored');
}

function parseChangeId(formData: FormData) {
  const parsed = changeActionSchema.safeParse({
    changeId: formData.get('changeId'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '변경 ID를 확인해 주세요.');
  }
  return parsed.data.changeId;
}
