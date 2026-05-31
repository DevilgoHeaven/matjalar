import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ignoreCorrectionReport,
  resolveCorrectionReport,
} from '@/app/actions/admin/corrections';
import { getPendingCorrectionReports } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '최근 제보 - 맛잘알 Admin',
};

interface AdminCorrectionsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCorrectionsPage({
  searchParams,
}: AdminCorrectionsPageProps) {
  const [reports, resolvedSearchParams] = await Promise.all([
    getPendingCorrectionReports(),
    searchParams,
  ]);
  const updated = getFirstParam(resolvedSearchParams?.updated);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">최근 제보</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              비회원 가격·품절·옵션 제보를 검토합니다. 여기서 처리해도 공개 데이터는 자동 변경되지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminLink href="/admin">대시보드</AdminLink>
            <AdminLink href="/admin/source-refs">데이터 신뢰도</AdminLink>
            <AdminLink href="/admin/analytics">성장 지표</AdminLink>
          </div>
        </div>

        {updated ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700"
          >
            제보가 처리되었습니다.
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
                      {formatTargetType(report.targetType)} · {formatReportKind(report.reportKind)}
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
                      {report.note ?? '메모 없음'}
                    </p>
                    {report.sourceUrl ? (
                      <a
                        href={report.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex break-all text-sm font-bold text-action underline-offset-4 hover:underline"
                      >
                        {report.sourceUrl}
                      </a>
                    ) : null}
                    <p className="mt-3 text-xs font-semibold text-stone-400">
                      {formatDateTime(report.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    <CorrectionActionForm
                      action={resolveCorrectionReport}
                      reportId={report.id}
                      label="처리 완료"
                    />
                    <CorrectionActionForm
                      action={ignoreCorrectionReport}
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
            대기 중인 제보가 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
    >
      {children}
    </Link>
  );
}

function CorrectionActionForm({
  action,
  reportId,
  label,
  variant = 'primary',
}: {
  action: (formData: FormData) => Promise<void>;
  reportId: string;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const className =
    variant === 'secondary'
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
  const labels: Record<string, string> = {
    combo: '조합',
    brand: '브랜드',
    menu: '메뉴',
  };
  return labels[targetType] ?? targetType;
}

function formatReportKind(kind: string) {
  const labels: Record<string, string> = {
    price: '가격',
    sold_out: '품절',
    option_changed: '옵션 변경',
    combo_feedback: '조합 피드백',
  };
  return labels[kind] ?? kind;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
