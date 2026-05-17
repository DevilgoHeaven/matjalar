import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminDashboardData } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '관리자 대시보드 - 맛잘알 Admin',
};

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-stone-200 pb-6">
          <p className="text-xs font-bold text-stone-500">맛잘알 Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">
            운영 대시보드
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            승인, 신고, 카탈로그 변경, 유저 상태를 한 화면에서 확인합니다.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="승인 대기 조합"
            value={data.pendingCombos}
            href="/admin/combos"
          />
          <MetricCard
            label="대기 중 신고"
            value={data.pendingReports}
            href="/admin/reports"
          />
          <MetricCard
            label="카탈로그 변경"
            value={data.pendingCatalogChanges}
            href="/admin/catalog-changes"
          />
          <MetricCard
            label="정지 유저"
            value={data.suspendedUsers}
            href="/admin/users"
          />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">운영 메뉴</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AdminAction
                href="/admin/combos"
                title="조합 승인"
                description="회원이 제출한 pending 조합을 공개 또는 반려합니다."
              />
              <AdminAction
                href="/admin/reports"
                title="신고 처리"
                description="조합과 후기 신고를 검토하고 숨김·처리·무시합니다."
              />
              <AdminAction
                href="/admin/catalog-changes"
                title="카탈로그 변경 승인"
                description="크롤러가 감지한 메뉴와 옵션 변경을 production에 반영합니다."
              />
              <AdminAction
                href="/admin/users"
                title="유저 관리"
                description="악성 활동 계정을 정지하거나 오처리된 계정을 활성화합니다."
              />
              <AdminAction
                href="/admin/seed"
                title="시드 등록"
                description="운영자 추천 메모가 포함된 공개 조합을 생성합니다."
              />
            </div>
          </div>

          <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">최근 크롤러 실행</h2>
            {data.latestCrawlerRun ? (
              <dl className="mt-4 grid gap-3 text-sm">
                <InfoRow label="소스" value={data.latestCrawlerRun.sourceName} />
                <InfoRow label="상태" value={data.latestCrawlerRun.status} />
                <InfoRow
                  label="시작"
                  value={formatDateTime(data.latestCrawlerRun.startedAt)}
                />
                <InfoRow
                  label="종료"
                  value={
                    data.latestCrawlerRun.finishedAt
                      ? formatDateTime(data.latestCrawlerRun.finishedAt)
                      : '진행 중'
                  }
                />
              </dl>
            ) : (
              <p className="mt-4 rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-semibold leading-6 text-stone-500">
                아직 기록된 크롤러 실행이 없습니다.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-400"
    >
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </Link>
  );
}

function AdminAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-stone-200 bg-stone-50 p-4 transition hover:border-stone-400 hover:bg-white"
    >
      <h3 className="text-base font-black">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">
        {description}
      </p>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-stone-500">{label}</dt>
      <dd className="mt-1 break-words font-bold text-stone-700">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
