import 'server-only';

import type { Database } from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type CorrectionReportRow = Pick<
  TableRow<'correction_reports'>,
  | 'id'
  | 'target_type'
  | 'target_id'
  | 'report_kind'
  | 'note'
  | 'source_url'
  | 'status'
  | 'created_at'
>;
type ComboRow = Pick<TableRow<'combos'>, 'id' | 'title' | 'status'>;
type BrandRow = Pick<TableRow<'brands'>, 'id' | 'name' | 'slug' | 'is_active'>;
type MenuRow = Pick<TableRow<'menus'>, 'id' | 'name' | 'brand_id' | 'status'>;

export interface AdminCorrectionReport {
  id: string;
  targetType: string;
  targetId: string;
  reportKind: string;
  note: string | null;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
  target: {
    label: string;
    status: string;
    href: string | null;
    missing: boolean;
  };
}

export async function getPendingCorrectionReports(): Promise<AdminCorrectionReport[]> {
  await assertActiveAdminUser();

  const db = asSupabaseQueryClient(getSupabaseAdminClient());
  const { data: reports, error } = await db
    .from('correction_reports')
    .select<CorrectionReportRow>(
      'id, target_type, target_id, report_kind, note, source_url, status, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  const rows = reports ?? [];
  if (rows.length === 0) return [];

  const comboIds = targetIds(rows, 'combo');
  const brandIds = targetIds(rows, 'brand');
  const menuIds = targetIds(rows, 'menu');

  const [
    { data: combos, error: combosError },
    { data: brands, error: brandsError },
    { data: menus, error: menusError },
  ] = await Promise.all([
    comboIds.length
      ? db.from('combos').select<ComboRow>('id, title, status').in('id', comboIds)
      : Promise.resolve({ data: [], error: null }),
    brandIds.length
      ? db
          .from('brands')
          .select<BrandRow>('id, name, slug, is_active')
          .in('id', brandIds)
      : Promise.resolve({ data: [], error: null }),
    menuIds.length
      ? db.from('menus').select<MenuRow>('id, name, brand_id, status').in('id', menuIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (combosError) throw new Error(combosError.message);
  if (brandsError) throw new Error(brandsError.message);
  if (menusError) throw new Error(menusError.message);

  const menuBrandIds = [...new Set((menus ?? []).map((menu) => menu.brand_id))];
  const { data: menuBrands, error: menuBrandsError } = menuBrandIds.length
    ? await db
        .from('brands')
        .select<BrandRow>('id, name, slug, is_active')
        .in('id', menuBrandIds)
    : { data: [], error: null };

  if (menuBrandsError) throw new Error(menuBrandsError.message);

  const comboById = new Map((combos ?? []).map((combo) => [combo.id, combo]));
  const brandById = new Map(
    [...(brands ?? []), ...(menuBrands ?? [])].map((brand) => [brand.id, brand])
  );
  const menuById = new Map((menus ?? []).map((menu) => [menu.id, menu]));

  return rows.map((report) => ({
    id: report.id,
    targetType: report.target_type,
    targetId: report.target_id,
    reportKind: report.report_kind,
    note: report.note,
    sourceUrl: report.source_url,
    status: report.status,
    createdAt: report.created_at,
    target: describeTarget(report, comboById, brandById, menuById),
  }));
}

function targetIds(rows: CorrectionReportRow[], targetType: string) {
  return rows
    .filter((row) => row.target_type === targetType)
    .map((row) => row.target_id);
}

function describeTarget(
  report: CorrectionReportRow,
  comboById: Map<string, ComboRow>,
  brandById: Map<string, BrandRow>,
  menuById: Map<string, MenuRow>
): AdminCorrectionReport['target'] {
  if (report.target_type === 'combo') {
    const combo = comboById.get(report.target_id);
    return combo
      ? {
          label: combo.title,
          status: combo.status,
          href: `/combo/${combo.id}`,
          missing: false,
        }
      : missingTarget('조합');
  }

  if (report.target_type === 'brand') {
    const brand = brandById.get(report.target_id);
    return brand
      ? {
          label: brand.name,
          status: brand.is_active ? 'active' : 'inactive',
          href: `/brand/${brand.slug}`,
          missing: false,
        }
      : missingTarget('브랜드');
  }

  const menu = menuById.get(report.target_id);
  const brand = menu ? brandById.get(menu.brand_id) : null;
  return menu
    ? {
        label: brand ? `${brand.name} · ${menu.name}` : menu.name,
        status: menu.status,
        href: brand ? `/brand/${brand.slug}` : null,
        missing: false,
      }
    : missingTarget('메뉴');
}

function missingTarget(label: string) {
  return {
    label: `삭제되었거나 찾을 수 없는 ${label}`,
    status: 'missing',
    href: null,
    missing: true,
  };
}
