export type AdminAnalyticsEventType =
  | 'page_view'
  | 'list_view'
  | 'detail_view'
  | 'login_modal_open'
  | 'login_completed'
  | 'vote_click'
  | 'bookmark_click'
  | 'review_submit'
  | 'combo_register_started'
  | 'combo_register_submitted'
  | 'order_copy'
  | 'share_click'
  | 'ranking_view'
  | 'quiz_result_share'
  | 'client_error'
  | 'report_submit'
  | 'correction_submit'
  | string;

export interface AdminAnalyticsEvent {
  createdAt: string;
  sessionId: string;
  type: AdminAnalyticsEventType;
  payload: Record<string, unknown>;
}

export interface AdminAnalyticsWindow {
  days: 7 | 14 | 30;
  sessions: number;
  listViews: number;
  detailViews: number;
  listSessions: number;
  detailSessions: number;
  orderCopies: number;
  shareClicks: number;
  quizResultShares: number;
  rankingViews: number;
  correctionSubmits: number;
  clientErrors: number;
  detailFromListRate: number;
  orderCopyFromDetailRate: number;
  shareFromDetailRate: number;
}

export interface AdminAnalyticsBucket {
  key: string;
  count: number;
}

export interface AdminAnalyticsComboMetric {
  comboId: string;
  score: number;
  detailViews: number;
  orderCopies: number;
  shareClicks: number;
  correctionSubmits: number;
}

export interface AdminAnalyticsClientError {
  createdAt: string;
  message: string;
  url: string | null;
}

export interface AdminAnalyticsSummary {
  generatedAt: string;
  windows: AdminAnalyticsWindow[];
  topCombos: AdminAnalyticsComboMetric[];
  rankingKinds: AdminAnalyticsBucket[];
  quizPreferences: AdminAnalyticsBucket[];
  latestClientErrors: AdminAnalyticsClientError[];
}

const WINDOWS: Array<7 | 14 | 30> = [7, 14, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

export function computeAdminAnalytics(
  events: AdminAnalyticsEvent[],
  now: Date = new Date()
): AdminAnalyticsSummary {
  const sortedEvents = [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );

  return {
    generatedAt: now.toISOString(),
    windows: WINDOWS.map((days) => computeWindow(sortedEvents, days, now)),
    topCombos: topCombos(sortedEvents, 10),
    rankingKinds: topBuckets(sortedEvents, 'ranking_view', 'ranking_kind', 10),
    quizPreferences: quizPreferenceBuckets(sortedEvents, 10),
    latestClientErrors: latestClientErrors(sortedEvents, 8),
  };
}

function computeWindow(
  events: AdminAnalyticsEvent[],
  days: 7 | 14 | 30,
  now: Date
): AdminAnalyticsWindow {
  const since = now.getTime() - days * DAY_MS;
  const scoped = events.filter((event) => Date.parse(event.createdAt) >= since);
  const sessions = new Set(scoped.map((event) => event.sessionId).filter(Boolean));
  const listSessions = sessionSet(scoped, 'list_view');
  const detailSessions = sessionSet(scoped, 'detail_view');
  const listToDetailSessions = intersectionCount(listSessions, detailSessions);
  const orderCopySessions = sessionSet(scoped, 'order_copy');
  const comboShareSessions = sessionSetWhere(
    scoped,
    (event) => event.type === 'share_click' && event.payload.target_type === 'combo'
  );

  return {
    days,
    sessions: sessions.size,
    listViews: countType(scoped, 'list_view'),
    detailViews: countType(scoped, 'detail_view'),
    listSessions: listSessions.size,
    detailSessions: detailSessions.size,
    orderCopies: countType(scoped, 'order_copy'),
    shareClicks: countType(scoped, 'share_click'),
    quizResultShares: countType(scoped, 'quiz_result_share'),
    rankingViews: countType(scoped, 'ranking_view'),
    correctionSubmits: countType(scoped, 'correction_submit'),
    clientErrors: countType(scoped, 'client_error'),
    detailFromListRate: rate(listToDetailSessions, listSessions.size),
    orderCopyFromDetailRate: rate(orderCopySessions.size, detailSessions.size),
    shareFromDetailRate: rate(comboShareSessions.size, detailSessions.size),
  };
}

function topCombos(
  events: AdminAnalyticsEvent[],
  limit: number
): AdminAnalyticsComboMetric[] {
  const metrics = new Map<string, AdminAnalyticsComboMetric>();

  for (const event of events) {
    const comboId = getComboId(event);
    if (!comboId) continue;

    const current =
      metrics.get(comboId) ??
      {
        comboId,
        score: 0,
        detailViews: 0,
        orderCopies: 0,
        shareClicks: 0,
        correctionSubmits: 0,
      };

    if (event.type === 'detail_view') {
      current.detailViews += 1;
      current.score += 1;
    } else if (event.type === 'order_copy') {
      current.orderCopies += 1;
      current.score += 4;
    } else if (event.type === 'share_click' || event.type === 'quiz_result_share') {
      current.shareClicks += 1;
      current.score += 3;
    } else if (event.type === 'correction_submit') {
      current.correctionSubmits += 1;
      current.score += 2;
    }

    metrics.set(comboId, current);
  }

  return [...metrics.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.orderCopies - a.orderCopies ||
        b.shareClicks - a.shareClicks ||
        b.detailViews - a.detailViews
    )
    .slice(0, limit);
}

function topBuckets(
  events: AdminAnalyticsEvent[],
  eventType: string,
  payloadKey: string,
  limit: number
): AdminAnalyticsBucket[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== eventType) continue;
    const key = readString(event.payload[payloadKey]);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return sortBuckets(counts, limit);
}

function quizPreferenceBuckets(
  events: AdminAnalyticsEvent[],
  limit: number
): AdminAnalyticsBucket[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== 'quiz_result_share') continue;
    const raw = readString(event.payload.result_kind);
    if (!raw) continue;
    for (const key of raw.split(',').map((item) => item.trim()).filter(Boolean)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return sortBuckets(counts, limit);
}

function latestClientErrors(
  events: AdminAnalyticsEvent[],
  limit: number
): AdminAnalyticsClientError[] {
  return events
    .filter((event) => event.type === 'client_error')
    .slice(0, limit)
    .map((event) => ({
      createdAt: event.createdAt,
      message: readString(event.payload.message) ?? 'unknown_error',
      url: readString(event.payload.url),
    }));
}

function getComboId(event: AdminAnalyticsEvent): string | null {
  if (event.type === 'correction_submit' && event.payload.target_type === 'combo') {
    return readString(event.payload.target_id);
  }
  if (event.type === 'share_click') {
    return event.payload.target_type === 'combo'
      ? readString(event.payload.target_id)
      : null;
  }
  return readString(event.payload.combo_id);
}

function sessionSet(events: AdminAnalyticsEvent[], type: string) {
  return sessionSetWhere(events, (event) => event.type === type);
}

function sessionSetWhere(
  events: AdminAnalyticsEvent[],
  predicate: (event: AdminAnalyticsEvent) => boolean
) {
  return new Set(
    events
      .filter(predicate)
      .map((event) => event.sessionId)
      .filter(Boolean)
  );
}

function countType(events: AdminAnalyticsEvent[], type: string): number {
  return events.filter((event) => event.type === type).length;
}

function intersectionCount<T>(left: Set<T>, right: Set<T>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function sortBuckets(counts: Map<string, number>, limit: number) {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
