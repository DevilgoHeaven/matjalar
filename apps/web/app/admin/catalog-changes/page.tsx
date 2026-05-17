import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  approveCatalogChange,
  ignoreCatalogChange,
} from '@/app/actions/admin/catalog-changes';
import { getPendingCatalogChanges } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '카탈로그 변경 승인 - 맛잘알 Admin',
};

interface AdminCatalogChangesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCatalogChangesPage({
  searchParams,
}: AdminCatalogChangesPageProps) {
  const [changes, resolvedSearchParams] = await Promise.all([
    getPendingCatalogChanges(),
    searchParams,
  ]);
  const updated = getFirstParam(resolvedSearchParams?.updated);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              카탈로그 변경 승인
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              크롤러가 감지한 메뉴·옵션 변경을 검토한 뒤 production 카탈로그에
              반영하거나 무시합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminLink href="/admin">대시보드</AdminLink>
            <AdminLink href="/admin/combos">승인 대기</AdminLink>
            <AdminLink href="/admin/reports">신고 처리</AdminLink>
            <AdminLink href="/admin/users">유저 관리</AdminLink>
            <AdminLink href="/admin/seed">시드 등록</AdminLink>
          </div>
        </div>

        {updated ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700"
          >
            카탈로그 변경이 처리되었습니다.
          </p>
        ) : null}

        {changes.length ? (
          <ul className="mt-6 grid gap-4">
            {changes.map((change) => (
              <li
                key={change.id}
                className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-500">
                      {formatTargetType(change.targetType)} ·{' '}
                      {formatChangeType(change.changeType)} · {change.brandLabel}
                    </p>
                    <h2 className="mt-2 break-words text-xl font-black">
                      {change.targetLabel}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                        {change.sourceName}
                      </span>
                      {change.externalId ? (
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                          external_id {change.externalId}
                        </span>
                      ) : null}
                    </div>
                    {change.approveBlockReason ? (
                      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">
                        {change.approveBlockReason}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs font-semibold text-stone-400">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(change.createdAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    {change.canApprove ? (
                      <CatalogChangeActionForm
                        action={approveCatalogChange}
                        changeId={change.id}
                        label="승인 적용"
                      />
                    ) : null}
                    <CatalogChangeActionForm
                      action={ignoreCatalogChange}
                      changeId={change.id}
                      label="무시"
                      variant="secondary"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <JsonPreview title="Before" value={change.beforePreview} />
                  <JsonPreview title="After" value={change.afterPreview} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm font-semibold text-stone-500">
            승인 대기 중인 카탈로그 변경이 없습니다.
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

function CatalogChangeActionForm({
  action,
  changeId,
  label,
  variant = 'primary',
}: {
  action: (formData: FormData) => Promise<void>;
  changeId: string;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const className =
    variant === 'secondary'
      ? 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500'
      : 'bg-action text-white hover:bg-stone-800';

  return (
    <form action={action}>
      <input type="hidden" name="changeId" value={changeId} />
      <button
        type="submit"
        className={`inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-black transition ${className}`}
      >
        {label}
      </button>
    </form>
  );
}

function JsonPreview({ title, value }: { title: string; value: string }) {
  return (
    <section className="min-w-0 rounded-md border border-stone-200 bg-stone-50">
      <h3 className="border-b border-stone-200 px-3 py-2 text-xs font-black text-stone-500">
        {title}
      </h3>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5 text-stone-700">
        {value}
      </pre>
    </section>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}

function formatTargetType(targetType: string) {
  const labels: Record<string, string> = {
    menu: '메뉴',
    menu_variant: '메뉴 변형',
    option_group: '옵션 그룹',
    option_item: '옵션 항목',
  };
  return labels[targetType] ?? targetType;
}

function formatChangeType(changeType: string) {
  const labels: Record<string, string> = {
    created: '신규',
    updated: '수정',
    missing: '누락',
    selector_error: '셀렉터 오류',
  };
  return labels[changeType] ?? changeType;
}
