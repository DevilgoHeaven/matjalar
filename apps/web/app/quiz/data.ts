import 'server-only';

import { loadPublishedCombos, type PublicCombo } from '@/lib/combo/public-combos';

export async function getQuizPageData(): Promise<PublicCombo[]> {
  const combos = await loadPublishedCombos();
  return combos.slice(0, 80);
}
