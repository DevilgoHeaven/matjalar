import 'server-only';

import type {
  AdminAnalyticsSummary,
  Database,
} from '@mzr/db';
import { computeAdminAnalytics } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type EventRow = Pick<
  TableRow<'events'>,
  'created_at' | 'session_id' | 'type' | 'payload'
>;
type ComboRow = Pick<TableRow<'combos'>, 'id' | 'title' | 'brand_id'>;
type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name'>;

export interface AdminAnalyticsPageData {
  summary: AdminAnalyticsSummary;
  comboLabels: Record<string, string>;
}

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsPageData> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await db
    .from('events')
    .select<EventRow>('created_at, session_id, type, payload')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  const summary = computeAdminAnalytics(
    (rows ?? []).map((row) => ({
      createdAt: row.created_at,
      sessionId: row.session_id,
      type: row.type,
      payload: asRecord(row.payload),
    }))
  );
  const comboLabels = await loadComboLabels(summary.topCombos.map((combo) => combo.comboId));

  return { summary, comboLabels };
}

async function loadComboLabels(comboIds: string[]) {
  const uniqueIds = [...new Set(comboIds)].filter(isUuid);
  if (uniqueIds.length === 0) return {};

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: combos, error: combosError } = await db
    .from('combos')
    .select<ComboRow>('id, title, brand_id')
    .in('id', uniqueIds);

  if (combosError) throw new Error(combosError.message);

  const brandIds = [...new Set((combos ?? []).map((combo) => combo.brand_id))];
  const { data: brands, error: brandsError } = brandIds.length
    ? await db.from('brands').select<BrandRow>('id, name').in('id', brandIds)
    : { data: [], error: null };

  if (brandsError) throw new Error(brandsError.message);

  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand.name]));
  return Object.fromEntries(
    (combos ?? []).map((combo) => [
      combo.id,
      `${brandById.get(combo.brand_id) ?? '브랜드'} · ${combo.title}`,
    ])
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function asRecord(value: Database['public']['Tables']['events']['Row']['payload']) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
