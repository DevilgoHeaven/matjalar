import { describe, expect, it } from 'vitest';
import {
  computeAdminAnalytics,
  type AdminAnalyticsEvent,
} from './admin-analytics';

const NOW = new Date('2026-05-25T12:00:00.000Z');

describe('computeAdminAnalytics', () => {
  it('summarizes funnel, growth actions, rankings, quiz preferences, and errors', () => {
    const events: AdminAnalyticsEvent[] = [
      event('2026-05-25T11:00:00.000Z', 's1', 'list_view', {
        list_kind: 'home',
        count: 12,
      }),
      event('2026-05-25T11:01:00.000Z', 's1', 'detail_view', {
        combo_id: 'combo-a',
      }),
      event('2026-05-25T11:02:00.000Z', 's1', 'order_copy', {
        combo_id: 'combo-a',
      }),
      event('2026-05-25T11:03:00.000Z', 's1', 'share_click', {
        target_type: 'combo',
        target_id: 'combo-a',
        channel: 'clipboard',
      }),
      event('2026-05-24T11:00:00.000Z', 's2', 'ranking_view', {
        ranking_kind: 'budget',
        count: 8,
      }),
      event('2026-05-24T11:01:00.000Z', 's2', 'quiz_result_share', {
        result_kind: 'budget,beginner',
        combo_id: 'combo-b',
      }),
      event('2026-05-24T11:02:00.000Z', 's2', 'share_click', {
        target_type: 'quiz_result',
        target_id: 'beginner,budget',
        channel: 'clipboard',
      }),
      event('2026-05-23T11:00:00.000Z', 's3', 'correction_submit', {
        target_type: 'combo',
        target_id: 'combo-b',
        report_kind: 'price',
      }),
      event('2026-05-22T11:00:00.000Z', 's4', 'client_error', {
        message: 'hydration failed',
        url: '/combo/combo-a',
      }),
      event('2026-05-01T11:00:00.000Z', 'old', 'list_view', {
        list_kind: 'home',
        count: 1,
      }),
    ];

    const summary = computeAdminAnalytics(events, NOW);
    const last7 = summary.windows.find((window) => window.days === 7);

    expect(last7).toMatchObject({
      sessions: 4,
      listViews: 1,
      detailViews: 1,
      orderCopies: 1,
      shareClicks: 2,
      quizResultShares: 1,
      rankingViews: 1,
      correctionSubmits: 1,
      clientErrors: 1,
      detailFromListRate: 100,
      orderCopyFromDetailRate: 100,
      shareFromDetailRate: 100,
    });
    expect(summary.topCombos[0]).toMatchObject({
      comboId: 'combo-a',
      score: 8,
      detailViews: 1,
      orderCopies: 1,
      shareClicks: 1,
    });
    expect(summary.topCombos.map((combo) => combo.comboId)).not.toContain(
      'beginner,budget'
    );
    expect(summary.rankingKinds).toEqual([{ key: 'budget', count: 1 }]);
    expect(summary.quizPreferences).toEqual([
      { key: 'beginner', count: 1 },
      { key: 'budget', count: 1 },
    ]);
    expect(summary.latestClientErrors).toEqual([
      {
        createdAt: '2026-05-22T11:00:00.000Z',
        message: 'hydration failed',
        url: '/combo/combo-a',
      },
    ]);
  });

  it('counts list to detail conversion from the session intersection only', () => {
    const summary = computeAdminAnalytics(
      [
        event('2026-05-25T11:00:00.000Z', 'list-and-detail', 'list_view', {
          list_kind: 'home',
        }),
        event('2026-05-25T11:01:00.000Z', 'list-and-detail', 'detail_view', {
          combo_id: 'combo-a',
        }),
        event('2026-05-25T11:02:00.000Z', 'direct-detail', 'detail_view', {
          combo_id: 'combo-b',
        }),
        event('2026-05-25T11:03:00.000Z', 'list-only', 'list_view', {
          list_kind: 'home',
        }),
      ],
      NOW
    );

    expect(summary.windows.find((window) => window.days === 7)).toMatchObject({
      listSessions: 2,
      detailSessions: 2,
      detailFromListRate: 50,
    });
  });
});

function event(
  createdAt: string,
  sessionId: string,
  type: string,
  payload: Record<string, unknown>
): AdminAnalyticsEvent {
  return { createdAt, sessionId, type, payload };
}
