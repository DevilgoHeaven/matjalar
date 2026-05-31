import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type SourceRefRow = Pick<
  TableRow<'content_source_refs'>,
  | 'id'
  | 'target_type'
  | 'target_id'
  | 'source_kind'
  | 'confidence'
  | 'price_status'
  | 'title'
  | 'source_url'
  | 'observed_at'
  | 'created_at'
>;
type SourceRefCountRow = Pick<
  TableRow<'content_source_refs'>,
  'confidence' | 'price_status'
>;

export interface AdminSourceRef {
  id: string;
  targetType: string;
  targetId: string;
  sourceKind: string;
  confidence: string;
  priceStatus: string;
  title: string;
  sourceUrl: string | null;
  observedAt: string;
  createdAt: string;
}

export interface AdminSourceRefData {
  refs: AdminSourceRef[];
  counts: {
    total: number;
    confirmed: number;
    approx: number;
    unverified: number;
    exactPrice: number;
  };
}

export async function getAdminSourceRefData(): Promise<AdminSourceRefData> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const [
    { data: refs, error },
    { data: countRows, error: countError },
  ] = await Promise.all([
    db
      .from('content_source_refs')
      .select<SourceRefRow>(
        'id, target_type, target_id, source_kind, confidence, price_status, title, source_url, observed_at, created_at'
      )
      .order('observed_at', { ascending: false })
      .limit(100),
    db
      .from('content_source_refs')
      .select<SourceRefCountRow>('confidence, price_status'),
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  const rows = refs ?? [];
  const metrics = countRows ?? [];
  return {
    refs: rows.map((row) => ({
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      sourceKind: row.source_kind,
      confidence: row.confidence,
      priceStatus: row.price_status,
      title: row.title,
      sourceUrl: row.source_url,
      observedAt: row.observed_at,
      createdAt: row.created_at,
    })),
    counts: {
      total: metrics.length,
      confirmed: metrics.filter((row) => row.confidence === 'confirmed').length,
      approx: metrics.filter((row) => row.confidence === 'approx').length,
      unverified: metrics.filter((row) => row.confidence === 'unverified').length,
      exactPrice: metrics.filter((row) => row.price_status === 'exact').length,
    },
  };
}
