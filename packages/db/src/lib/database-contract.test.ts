import { describe, expect, it } from 'vitest';
import type { Database } from '../types/database';

type PublicFunctionName = keyof Database['public']['Functions'];

const REQUIRED_PUBLIC_RPC_NAMES = [
  'insert_event',
  'submit_correction_report',
  'get_public_source_ref_summaries',
] satisfies PublicFunctionName[];

describe('generated database contract', () => {
  it('keeps app RPC names in the generated Database type', () => {
    expect(REQUIRED_PUBLIC_RPC_NAMES).toEqual([
      'insert_event',
      'submit_correction_report',
      'get_public_source_ref_summaries',
    ]);
  });
});
