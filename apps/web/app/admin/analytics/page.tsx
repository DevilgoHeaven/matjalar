import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminAnalyticsData } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '성장 지표 - 맛잘알 Admin',
};

export default async function AdminAnalyticsPage() {
  const { summary, comboLabels } = await getAdminAnalyticsData();
  const primary = summary.windows.find((window) => window.days === 7) ?? summary.windows[0];
  const maxComboScore = Math.max(...summary.topCombos.map((combo) => combo.score), 1);
  const maxRankingCount = Math.max(...summary.rankingKinds.map((item) => item.count), 1);
  const maxQuizCount = Math.max(...summary.quizPreferences.map((item) => item.count), 1);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">성장 지표</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              최근 7·14·30일 세션, 상세 전환, 주문문 복사, 공유, 퀴즈, 랭킹 반응을 봅니다.
            </p>
            <p className="mt-1 text-xs font-bold text-stone-400">
              최근 30일 최대 5,000 이벤트 기준
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
          >
            대시보드
          </Link>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="7일 세션" value={primary.sessions} />
          <MetricCard label="상세 진입" value={primary.detailViews} />
          <MetricCard label="주문문 복사" value={primary.orderCopies} />
          <MetricCard label="공유 클릭" value={primary.shareClicks} />
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-3">
          {summary.windows.map((window) => (
            <div
              key={window.days}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-black">최근 {window.days}일</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <InfoRow label="목록 세션" value={`${window.listSessions}`} />
                <InfoRow label="상세 세션" value={`${window.detailSessions}`} />
                <InfoRow label="목록→상세" value={`${window.detailFromListRate}%`} />
                <InfoRow
                  label="상세→주문복사"
                  value={`${window.orderCopyFromDetailRate}%`}
                />
                <InfoRow
                  label="상세→공유"
                  value={`${window.shareFromDetailRate}%`}
                />
                <InfoRow label="제보" value={`${window.correctionSubmits}`} />
                <InfoRow label="클라이언트 오류" value={`${window.clientErrors}`} />
              </dl>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">상위 조합 반응</h2>
            {summary.topCombos.length ? (
              <div className="mt-4 grid gap-3">
                {summary.topCombos.map((combo) => (
                  <BarRow
                    key={combo.comboId}
                    label={comboLabels[combo.comboId] ?? combo.comboId}
                    value={combo.score}
                    max={maxComboScore}
                    detail={`상세 ${combo.detailViews} · 복사 ${combo.orderCopies} · 공유 ${combo.shareClicks} · 제보 ${combo.correctionSubmits}`}
                    href={`/combo/${combo.comboId}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text="최근 30일 조합 반응 이벤트가 없습니다." />
            )}
          </div>

          <div className="grid gap-4">
            <BucketPanel
              title="랭킹 종류"
              items={summary.rankingKinds}
              max={maxRankingCount}
            />
            <BucketPanel
              title="퀴즈 취향"
              items={summary.quizPreferences}
              max={maxQuizCount}
            />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">최근 클라이언트 오류</h2>
          {summary.latestClientErrors.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-stone-50 text-xs font-black text-stone-500">
                  <tr>
                    <th className="px-3 py-2">시간</th>
                    <th className="px-3 py-2">메시지</th>
                    <th className="px-3 py-2">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.latestClientErrors.map((error) => (
                    <tr key={`${error.createdAt}-${error.message}`} className="border-t border-stone-200">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-stone-500">
                        {formatDateTime(error.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-bold">{error.message}</td>
                      <td className="break-all px-3 py-2 font-semibold text-stone-500">
                        {error.url ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="최근 30일 클라이언트 오류 이벤트가 없습니다." />
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs font-bold text-stone-500">{label}</dt>
      <dd className="font-black text-stone-700">{value}</dd>
    </div>
  );
}

function BucketPanel({
  title,
  items,
  max,
}: {
  title: string;
  items: Array<{ key: string; count: number }>;
  max: number;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>
      {items.length ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <BarRow
              key={item.key}
              label={formatBucketKey(item.key)}
              value={item.count}
              max={max}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="집계할 이벤트가 없습니다." />
      )}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  detail,
  href,
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
  href?: string;
}) {
  const percent = Math.max(4, Math.round((value / Math.max(max, 1)) * 100));
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="line-clamp-1 text-sm font-black">{label}</span>
        <span className="shrink-0 text-sm font-black text-stone-500">{value}</span>
      </div>
      {detail ? (
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-stone-500">{detail}</p>
      ) : null}
      <div className="mt-2 h-2 rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-action"
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-md border border-stone-100 p-3 transition hover:border-stone-300"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-md border border-stone-100 p-3">{body}</div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-semibold text-stone-500">
      {text}
    </p>
  );
}

function formatBucketKey(value: string) {
  const labels: Record<string, string> = {
    hot: '실시간 인기',
    budget: '만원컷',
    beginner: '초보추천',
    diet: '다이어트',
    spicy: '매운맛',
    hearty: '든든한 점심',
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
