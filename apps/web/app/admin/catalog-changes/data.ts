import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type CatalogChangeRow = Pick<
  TableRow<'catalog_change_logs'>,
  | 'id'
  | 'crawler_run_id'
  | 'brand_id'
  | 'target_type'
  | 'external_id'
  | 'change_type'
  | 'before_data'
  | 'after_data'
  | 'status'
  | 'created_at'
>;
type CatalogJson = NonNullable<TableRow<'catalog_change_logs'>['after_data']>;
type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name' | 'slug'>;
type CrawlerRunRow = Pick<
  TableRow<'crawler_runs'>,
  'id' | 'source_name' | 'status' | 'started_at'
>;

export interface AdminCatalogChange {
  id: string;
  targetType: string;
  changeType: string;
  externalId: string | null;
  status: string;
  createdAt: string;
  sourceName: string;
  brandLabel: string;
  targetLabel: string;
  beforePreview: string;
  afterPreview: string;
  canApprove: boolean;
  approveBlockReason: string | null;
}

/**
 * 크롤러가 남긴 카탈로그 변경 승인 큐를 관리자 화면용으로 조립한다.
 */
export async function getPendingCatalogChanges(): Promise<AdminCatalogChange[]> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: changes, error } = await db
    .from('catalog_change_logs')
    .select<CatalogChangeRow>(
      'id, crawler_run_id, brand_id, target_type, external_id, change_type, before_data, after_data, status, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  const changeRows = changes ?? [];
  if (changeRows.length === 0) return [];

  const brandIds = [
    ...new Set(changeRows.map((change) => change.brand_id).filter(Boolean)),
  ] as string[];
  const crawlerRunIds = [
    ...new Set(changeRows.map((change) => change.crawler_run_id).filter(Boolean)),
  ] as string[];

  const [
    { data: brands, error: brandsError },
    { data: crawlerRuns, error: crawlerRunsError },
  ] = await Promise.all([
    brandIds.length
      ? db.from('brands').select<BrandRow>('id, name, slug').in('id', brandIds)
      : Promise.resolve({ data: [], error: null }),
    crawlerRunIds.length
      ? db
          .from('crawler_runs')
          .select<CrawlerRunRow>('id, source_name, status, started_at')
          .in('id', crawlerRunIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (brandsError) throw new Error(brandsError.message);
  if (crawlerRunsError) throw new Error(crawlerRunsError.message);

  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand]));
  const crawlerRunById = new Map(
    (crawlerRuns ?? []).map((run) => [run.id, run])
  );

  return changeRows.map((change) => {
    const brand = change.brand_id ? brandById.get(change.brand_id) : null;
    const crawlerRun = change.crawler_run_id
      ? crawlerRunById.get(change.crawler_run_id)
      : null;
    const approveBlockReason = getApproveBlockReason(change);

    return {
      id: change.id,
      targetType: change.target_type,
      changeType: change.change_type,
      externalId: change.external_id,
      status: change.status,
      createdAt: change.created_at,
      sourceName: crawlerRun?.source_name ?? '수동/출처 미상',
      brandLabel: brand ? `${brand.name} (${brand.slug})` : '브랜드 미상',
      targetLabel: getTargetLabel(change),
      beforePreview: stringifyPreview(change.before_data),
      afterPreview: stringifyPreview(change.after_data),
      canApprove: approveBlockReason === null,
      approveBlockReason,
    };
  });
}

function getTargetLabel(change: CatalogChangeRow) {
  const source = getJsonRecord(change.after_data) ?? getJsonRecord(change.before_data);
  const name = getStringField(source, 'name') ?? getStringField(source, 'label');
  if (name) return name;
  if (change.external_id) return `external_id ${change.external_id}`;
  return change.target_type;
}

function getApproveBlockReason(change: CatalogChangeRow) {
  if (change.change_type === 'selector_error') {
    return '크롤러 셀렉터 오류는 production 테이블에 적용할 변경이 없어 무시 처리만 가능합니다.';
  }
  if (
    change.change_type === 'missing' &&
    (change.target_type === 'option_group' || change.target_type === 'menu_variant')
  ) {
    return '이 대상은 현재 스키마에 비활성 상태 필드가 없어 자동 승인 적용을 막았습니다.';
  }
  return null;
}

function stringifyPreview(value: CatalogJson | null) {
  if (value === null) return '(없음)';
  const text = JSON.stringify(value, null, 2);
  return text.length > 1800 ? `${text.slice(0, 1800)}\n...` : text;
}

function getJsonRecord(value: CatalogJson | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, CatalogJson | undefined>;
}

function getStringField(
  source: Record<string, CatalogJson | undefined> | null,
  key: string
) {
  const value = source?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
