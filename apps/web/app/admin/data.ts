import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type ComboStatusRow = Pick<TableRow<'combos'>, 'status'>;
type ReportStatusRow = Pick<TableRow<'reports'>, 'status'>;
type CatalogChangeStatusRow = Pick<TableRow<'catalog_change_logs'>, 'status'>;
type AppUserStatusRow = Pick<TableRow<'app_users'>, 'status'>;
type CrawlerRunRow = Pick<
  TableRow<'crawler_runs'>,
  'source_name' | 'status' | 'started_at' | 'finished_at'
>;

export interface AdminDashboardData {
  pendingCombos: number;
  pendingReports: number;
  pendingCatalogChanges: number;
  suspendedUsers: number;
  latestCrawlerRun: {
    sourceName: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
  } | null;
}

/**
 * `/admin` 운영 대시보드에 필요한 최소 지표를 모은다.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const [
    { data: combos, error: combosError },
    { data: reports, error: reportsError },
    { data: catalogChanges, error: catalogChangesError },
    { data: users, error: usersError },
    { data: crawlerRuns, error: crawlerRunsError },
  ] = await Promise.all([
    db.from('combos').select<ComboStatusRow>('status').eq('status', 'pending'),
    db.from('reports').select<ReportStatusRow>('status').eq('status', 'pending'),
    db
      .from('catalog_change_logs')
      .select<CatalogChangeStatusRow>('status')
      .eq('status', 'pending'),
    db.from('app_users').select<AppUserStatusRow>('status').eq('status', 'suspended'),
    db
      .from('crawler_runs')
      .select<CrawlerRunRow>('source_name, status, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(1),
  ]);

  if (combosError) throw new Error(combosError.message);
  if (reportsError) throw new Error(reportsError.message);
  if (catalogChangesError) throw new Error(catalogChangesError.message);
  if (usersError) throw new Error(usersError.message);
  if (crawlerRunsError) throw new Error(crawlerRunsError.message);

  const latestCrawlerRun = crawlerRuns?.[0] ?? null;

  return {
    pendingCombos: combos?.length ?? 0,
    pendingReports: reports?.length ?? 0,
    pendingCatalogChanges: catalogChanges?.length ?? 0,
    suspendedUsers: users?.length ?? 0,
    latestCrawlerRun: latestCrawlerRun
      ? {
          sourceName: latestCrawlerRun.source_name,
          status: latestCrawlerRun.status,
          startedAt: latestCrawlerRun.started_at,
          finishedAt: latestCrawlerRun.finished_at,
        }
      : null,
  };
}
