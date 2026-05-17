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

type ReportRow = Pick<
  TableRow<'reports'>,
  'id' | 'target_type' | 'target_id' | 'status'
>;
type ComboTargetRow = Pick<TableRow<'combos'>, 'id' | 'brand_id'>;
type BrandSlugRow = Pick<TableRow<'brands'>, 'slug'>;
type ReviewTargetRow = Pick<TableRow<'reviews'>, 'id' | 'combo_id'>;

const reportActionSchema = z.object({
  reportId: uuidSchema,
});

/**
 * 신고 대상은 유지하고 신고만 처리 완료로 전환한다.
 */
export async function resolveReport(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const reportId = parseReportId(formData);
  await markReportStatus({
    reportId,
    adminUserId,
    status: 'resolved',
  });
  revalidatePath('/admin/reports');
  redirect('/admin/reports?updated=resolved');
}

/**
 * 조치가 필요 없는 신고를 ignored 상태로 닫는다.
 */
export async function ignoreReport(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const reportId = parseReportId(formData);
  await markReportStatus({
    reportId,
    adminUserId,
    status: 'ignored',
  });
  revalidatePath('/admin/reports');
  redirect('/admin/reports?updated=ignored');
}

/**
 * 신고 대상 조합/후기를 숨김 처리하고 신고를 해결 상태로 닫는다.
 */
export async function hideReportedTarget(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const reportId = parseReportId(formData);
  const report = await claimReportForTargetAction(reportId, adminUserId);

  if (report.target_type === 'combo') {
    const brandSlug = await hideCombo(report.target_id);
    revalidatePath(`/combo/${report.target_id}`);
    if (brandSlug) revalidatePath(`/brand/${brandSlug}`);
  } else {
    const comboId = await hideReview(report.target_id);
    if (comboId) {
      await recountReviewStats(comboId);
      revalidatePath(`/combo/${comboId}`);
    }
  }
  revalidatePath('/admin/reports');
  redirect('/admin/reports?updated=hidden');
}

function parseReportId(formData: FormData) {
  const parsed = reportActionSchema.safeParse({
    reportId: formData.get('reportId'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '신고 ID를 확인해 주세요.');
  }
  return parsed.data.reportId;
}

async function markReportStatus(input: {
  reportId: string;
  adminUserId: string;
  status: 'resolved' | 'ignored';
}) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('reports')
    .update({
      status: input.status,
      resolved_by: input.adminUserId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', input.reportId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('신고가 이미 처리되었거나 찾을 수 없습니다.');
  }
}

async function claimReportForTargetAction(reportId: string, adminUserId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('reports')
    .update({
      status: 'resolved',
      resolved_by: adminUserId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('status', 'pending')
    .select('id, target_type, target_id, status')
    .maybeSingle<ReportRow>();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('신고가 이미 처리되었거나 찾을 수 없습니다.');
  }
  return data;
}

async function hideCombo(comboId: string) {
  const admin = getSupabaseAdminClient();
  const { data: combo, error } = await admin
    .from('combos')
    .update({ status: 'hidden' })
    .eq('id', comboId)
    .select('id, brand_id')
    .maybeSingle<ComboTargetRow>();

  if (error) throw new Error(error.message);
  if (!combo) return null;

  const { data: brand, error: brandError } = await admin
    .from('brands')
    .select('slug')
    .eq('id', combo.brand_id)
    .maybeSingle<BrandSlugRow>();

  if (brandError) throw new Error(brandError.message);
  return brand?.slug ?? null;
}

async function hideReview(reviewId: string) {
  const admin = getSupabaseAdminClient();
  const { data: review, error: reviewError } = await admin
    .from('reviews')
    .select('id, combo_id')
    .eq('id', reviewId)
    .maybeSingle<ReviewTargetRow>();

  if (reviewError) throw new Error(reviewError.message);
  if (!review) return null;

  const { error } = await admin
    .from('reviews')
    .update({ status: 'hidden' })
    .eq('id', review.id);

  if (error) throw new Error(error.message);
  return review.combo_id;
}

async function recountReviewStats(comboId: string) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc('update_combo_stats', {
    p_combo: comboId,
    p_kind: 'review',
    p_delta: 0,
  });

  if (error) {
    console.warn('[hideReportedTarget] combo_stats 후기 재계산 실패:', error.message);
  }
}
