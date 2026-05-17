import type { Metadata } from 'next';
import Link from 'next/link';
import {
  hideReportedTarget,
  ignoreReport,
  resolveReport,
} from '@/app/actions/admin/reports';
import { getPendingReports } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '신고 처리 - 맛잘알 Admin',
};

interface AdminReportsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  const [reports, resolvedSearchParams] = await Promise.all([
    getPendingReports(),
    searchParams,
  ]);
  const updated = getFirstParam(resolvedSearchParams?.updated);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              신고 처리
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              조합과 후기 신고를 확인하고, 대상을 숨기거나 신고만 처리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              대시보드
            </Link>
            <Link
              href="/admin/catalog-changes"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              카탈로그 변경
            </Link>
            <Link
              href="/admin/combos"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              승인 대기
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              유저 관리
            </Link>
            <Link
              href="/admin/seed"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              시드 등록
            </Link>
          </div>
        </div>

        {updated ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700"
          >
            신고가 처리되었습니다.
          </p>
        ) : null}

        {reports.length ? (
          <ul className="mt-6 grid gap-4">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-500">
                      {formatTargetType(report.targetType)} · {report.reporterNickname}
                    </p>
                    <h2 className="mt-2 break-words text-xl font-black">
                      {report.target.href ? (
                        <Link
                          href={report.target.href}
                          className="underline-offset-4 hover:underline"
                        >
                          {report.target.label}
                        </Link>
                      ) : (
                        report.target.label
                      )}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                        대상 상태 {report.target.status}
                      </span>
                      {report.target.missing ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                          대상 없음
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 whitespace-pre-wrap break-words rounded-md bg-stone-50 p-3 text-sm font-semibold leading-6 text-stone-700">
                      {report.reason}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-stone-400">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(report.createdAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    {!report.target.missing ? (
                      <ReportActionForm
                        action={hideReportedTarget}
                        reportId={report.id}
                        label="대상 숨김"
                        variant="danger"
                      />
                    ) : null}
                    <ReportActionForm
                      action={resolveReport}
                      reportId={report.id}
                      label="처리 완료"
                    />
                    <ReportActionForm
                      action={ignoreReport}
                      reportId={report.id}
                      label="무시"
                      variant="secondary"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm font-semibold text-stone-500">
            대기 중인 신고가 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}

function ReportActionForm({
  action,
  reportId,
  label,
  variant = 'primary',
}: {
  action: (formData: FormData) => Promise<void>;
  reportId: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const className =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : variant === 'secondary'
        ? 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500'
        : 'bg-action text-white hover:bg-stone-800';

  return (
    <form action={action}>
      <input type="hidden" name="reportId" value={reportId} />
      <button
        type="submit"
        className={`inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-black transition ${className}`}
      >
        {label}
      </button>
    </form>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}

function formatTargetType(targetType: string) {
  return targetType === 'review' ? '후기 신고' : '조합 신고';
}
