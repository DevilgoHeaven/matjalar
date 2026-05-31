'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { uuidSchema } from '@/lib/z-schemas/common';

const correctionActionSchema = z.object({
  reportId: uuidSchema,
});

export async function resolveCorrectionReport(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const reportId = parseReportId(formData);
  await markCorrectionStatus({
    reportId,
    adminUserId,
    status: 'resolved',
  });
  revalidatePath('/admin/corrections');
  revalidatePath('/admin');
  redirect('/admin/corrections?updated=resolved');
}

export async function ignoreCorrectionReport(formData: FormData): Promise<void> {
  const adminUserId = await assertActiveAdminUser();
  const reportId = parseReportId(formData);
  await markCorrectionStatus({
    reportId,
    adminUserId,
    status: 'ignored',
  });
  revalidatePath('/admin/corrections');
  revalidatePath('/admin');
  redirect('/admin/corrections?updated=ignored');
}

function parseReportId(formData: FormData) {
  const parsed = correctionActionSchema.safeParse({
    reportId: formData.get('reportId'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '제보 ID를 확인해 주세요.');
  }
  return parsed.data.reportId;
}

async function markCorrectionStatus(input: {
  reportId: string;
  adminUserId: string;
  status: 'resolved' | 'ignored';
}) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('correction_reports')
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
    throw new Error('제보가 이미 처리되었거나 찾을 수 없습니다.');
  }
}
