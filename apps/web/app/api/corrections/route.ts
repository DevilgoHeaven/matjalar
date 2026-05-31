import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@mzr/db';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type EventType = Database['public']['Enums']['events_type'];
type Json = Database['public']['Tables']['events']['Insert']['payload'];

const correctionSchema = z.object({
  target_type: z.enum(['combo', 'brand', 'menu']),
  target_id: z.string().uuid(),
  report_kind: z.enum(['price', 'sold_out', 'option_changed', 'combo_feedback']),
  note: z
    .string()
    .max(280)
    .optional()
    .transform((value) => value?.normalize('NFC').trim() || null),
  source_url: z
    .string()
    .max(500)
    .optional()
    .transform((value, context) => {
      const normalized = normalizeHttpUrl(value);
      if (normalized.ok) return normalized.value;
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'invalid_source_url',
      });
      return z.NEVER;
    }),
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

  const parsed = correctionSchema.safeParse(parsedJson.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: errorForCorrectionIssues(parsed.error.issues) },
      { status: 400 }
    );
  }

  const sessionId = buildCorrectionQuotaKey(request);
  const admin = asSupabaseQueryClient(getSupabaseAdminClient());
  const { error } = await admin.rpc<string>('submit_correction_report', {
    p_session_id: sessionId,
    p_target_type: parsed.data.target_type,
    p_target_id: parsed.data.target_id,
    p_report_kind: parsed.data.report_kind,
    p_note: parsed.data.note,
    p_source_url: parsed.data.source_url,
  });

  if (error) {
    const status = statusForRpcError(error.message);
    if (status >= 500) {
      console.warn('[corrections] submit failed:', error.message);
    }
    return NextResponse.json({ error: normalizeRpcError(error.message) }, { status });
  }

  const eventPayload = {
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    report_kind: parsed.data.report_kind,
  };
  const supabase = await getSupabaseServerClient();
  const eventDb = asSupabaseQueryClient(supabase);
  const eventResult = await eventDb.rpc<undefined>('insert_event', {
    p_session_id: sessionId,
    p_type: 'correction_submit' as EventType,
    p_payload: eventPayload as Json,
  });
  if (eventResult.error) {
    console.warn('[corrections] event insert failed:', eventResult.error.message);
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

function normalizeHttpUrl(value: string | undefined):
  | { ok: true; value: string | null }
  | { ok: false } {
  const trimmed = value?.trim();
  if (!trimmed) return { ok: true, value: null };
  if (hasControlCharacter(trimmed)) {
    return { ok: false };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false };
    }
    if (!url.hostname || url.username || url.password) {
      return { ok: false };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false };
  }
}

function hasControlCharacter(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function buildCorrectionQuotaKey(request: Request) {
  const fingerprint = [
    firstForwardedIp(request.headers.get('x-forwarded-for')) ??
      request.headers.get('x-real-ip') ??
      'unknown-ip',
    request.headers.get('user-agent') ?? 'unknown-agent',
  ].join('|');
  const hash = createHash('sha256').update(fingerprint).digest('base64url');
  return `correction:${hash.slice(0, 64)}`;
}

function firstForwardedIp(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function errorForCorrectionIssues(issues: z.ZodIssue[]) {
  if (issues.some((issue) => issue.message === 'invalid_source_url')) {
    return 'invalid_source_url';
  }
  if (issues.some((issue) => issue.path[0] === 'target_type')) {
    return 'invalid_target_type';
  }
  if (issues.some((issue) => issue.path[0] === 'report_kind')) {
    return 'invalid_report_kind';
  }
  return 'invalid_correction';
}

function statusForRpcError(message: string) {
  if (message.includes('too_many_correction_reports')) return 429;
  if (message.includes('target_not_found')) return 404;
  if (
    message.includes('invalid_session_id') ||
    message.includes('invalid_target_type') ||
    message.includes('invalid_report_kind') ||
    message.includes('invalid_source_url')
  ) {
    return 400;
  }
  return 500;
}

function normalizeRpcError(message: string) {
  if (message.includes('too_many_correction_reports')) {
    return 'too_many_correction_reports';
  }
  if (message.includes('target_not_found')) return 'target_not_found';
  if (message.includes('invalid_session_id')) return 'invalid_session_id';
  if (message.includes('invalid_target_type')) return 'invalid_target_type';
  if (message.includes('invalid_report_kind')) return 'invalid_report_kind';
  if (message.includes('invalid_source_url')) return 'invalid_source_url';
  return 'correction_submit_failed';
}
