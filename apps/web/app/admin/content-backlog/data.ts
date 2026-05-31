import 'server-only';

import {
  V16_GROWTH_COMBO_SEEDS,
  summarizeGrowthComboSeeds,
  type GrowthComboSeed,
  type GrowthComboSeedSummary,
} from '@mzr/db';
import { assertActiveAdminUser } from '@/app/admin/_lib/auth';

export interface AdminContentBacklogData {
  seeds: GrowthComboSeed[];
  summary: GrowthComboSeedSummary;
}

export async function getAdminContentBacklogData(): Promise<AdminContentBacklogData> {
  await assertActiveAdminUser();

  return {
    seeds: V16_GROWTH_COMBO_SEEDS,
    summary: summarizeGrowthComboSeeds(),
  };
}
