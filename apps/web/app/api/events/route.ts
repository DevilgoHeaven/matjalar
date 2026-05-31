import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Database } from '@mzr/db';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type EventType = Database['public']['Enums']['events_type'];
type Json = Database['public']['Tables']['events']['Insert']['payload'];

const eventTypeSchema = z.enum([
  'page_view',
  'list_view',
  'detail_view',
  'login_modal_open',
  'login_completed',
  'vote_click',
  'bookmark_click',
  'review_submit',
  'combo_register_started',
  'combo_register_submitted',
  'order_copy',
  'share_click',
  'ranking_view',
  'quiz_result_share',
  'client_error',
  'report_submit',
  'correction_submit',
]);

const eventSchema = z.object({
  session_id: z.string().min(1).max(128),
  type: eventTypeSchema,
  payload: z.record(z.unknown()).default({}),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 4096) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }

  const parsedJson = safeParseJson(rawBody);
  if (!parsedJson.ok) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(parsedJson.value);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);

  const { error } = await db.rpc<undefined>('insert_event', {
    p_session_id: parsed.data.session_id,
    p_type: parsed.data.type as EventType,
    p_payload: parsed.data.payload as Json,
  });
  if (error) {
    console.warn('[events] insert failed:', error.message);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}

function safeParseJson(rawBody: string):
  | { ok: true; value: unknown }
  | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(rawBody) as unknown };
  } catch {
    return { ok: false };
  }
}
