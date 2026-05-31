import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ReportRow = Pick<
  TableRow<'reports'>,
  'id' | 'target_type' | 'target_id' | 'user_id' | 'reason' | 'status' | 'created_at'
>;
type AppUserRow = Pick<TableRow<'app_users'>, 'id' | 'nickname'>;
type ComboRow = Pick<TableRow<'combos'>, 'id' | 'title' | 'status'>;
type ReviewRow = Pick<
  TableRow<'reviews'>,
  'id' | 'combo_id' | 'content' | 'status' | 'rating'
>;

export interface AdminReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  reporterNickname: string;
  target: {
    label: string;
    status: string;
    href: string | null;
    missing: boolean;
  };
}

/**
 * 관리자 신고 처리 화면에 필요한 pending 신고 목록을 조립한다.
 */
export async function getPendingReports(): Promise<AdminReport[]> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: reports, error: reportsError } = await db
    .from('reports')
    .select<ReportRow>(
      'id, target_type, target_id, user_id, reason, status, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (reportsError) throw new Error(reportsError.message);
  const reportRows = reports ?? [];
  if (reportRows.length === 0) return [];

  const reporterIds = [...new Set(reportRows.map((report) => report.user_id))];
  const comboTargetIds = reportRows
    .filter((report) => report.target_type === 'combo')
    .map((report) => report.target_id);
  const reviewTargetIds = reportRows
    .filter((report) => report.target_type === 'review')
    .map((report) => report.target_id);

  const [
    { data: reporters, error: reportersError },
    { data: combos, error: combosError },
    { data: reviews, error: reviewsError },
  ] = await Promise.all([
    db.from('app_users').select<AppUserRow>('id, nickname').in('id', reporterIds),
    comboTargetIds.length
      ? db
          .from('combos')
          .select<ComboRow>('id, title, status')
          .in('id', comboTargetIds)
      : Promise.resolve({ data: [], error: null }),
    reviewTargetIds.length
      ? db
          .from('reviews')
          .select<ReviewRow>('id, combo_id, content, status, rating')
          .in('id', reviewTargetIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (reportersError) throw new Error(reportersError.message);
  if (combosError) throw new Error(combosError.message);
  if (reviewsError) throw new Error(reviewsError.message);

  const reporterById = new Map(
    (reporters ?? []).map((reporter) => [reporter.id, reporter])
  );
  const comboById = new Map((combos ?? []).map((combo) => [combo.id, combo]));
  const reviewById = new Map((reviews ?? []).map((review) => [review.id, review]));

  return reportRows.map((report) => {
    const reporter = reporterById.get(report.user_id);
    return {
      id: report.id,
      targetType: report.target_type,
      targetId: report.target_id,
      reason: report.reason,
      status: report.status,
      createdAt: report.created_at,
      reporterNickname: reporter?.nickname ?? '알 수 없음',
      target: describeReportTarget(report, comboById, reviewById),
    };
  });
}

function describeReportTarget(
  report: ReportRow,
  comboById: Map<string, ComboRow>,
  reviewById: Map<string, ReviewRow>
): AdminReport['target'] {
  if (report.target_type === 'combo') {
    const combo = comboById.get(report.target_id);
    return combo
      ? {
          label: combo.title,
          status: combo.status,
          href: `/combo/${combo.id}`,
          missing: false,
        }
      : {
          label: '삭제되었거나 찾을 수 없는 조합',
          status: 'missing',
          href: null,
          missing: true,
        };
  }

  const review = reviewById.get(report.target_id);
  return review
    ? {
        label: `별점 ${review.rating.toFixed(1)} · ${review.content}`,
        status: review.status,
        href: `/combo/${review.combo_id}`,
        missing: false,
      }
    : {
        label: '삭제되었거나 찾을 수 없는 후기',
        status: 'missing',
        href: null,
        missing: true,
      };
}
