import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { activateUser, suspendUser } from '@/app/actions/admin/users';
import { getAdminUsers } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '유저 관리 - 맛잘알 Admin',
};

interface AdminUsersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const [users, resolvedSearchParams] = await Promise.all([
    getAdminUsers(),
    searchParams,
  ]);
  const updated = getFirstParam(resolvedSearchParams?.updated);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">유저 관리</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              악성 활동 계정을 정지하거나, 오처리된 계정을 다시 활성화합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminLink href="/admin">대시보드</AdminLink>
            <AdminLink href="/admin/combos">승인 대기</AdminLink>
            <AdminLink href="/admin/reports">신고 처리</AdminLink>
            <AdminLink href="/admin/catalog-changes">카탈로그 변경</AdminLink>
          </div>
        </div>

        {updated ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700"
          >
            유저 상태가 변경되었습니다.
          </p>
        ) : null}

        {users.length ? (
          <ul className="mt-6 grid gap-3">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-xl font-black">
                        {user.nickname}
                      </h2>
                      {user.isSelf ? (
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                          현재 관리자
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                        role {user.role}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                        status {user.status}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                        {new Intl.DateTimeFormat('ko-KR', {
                          dateStyle: 'medium',
                        }).format(new Date(user.createdAt))}
                      </span>
                    </div>
                    <p className="mt-3 break-all text-xs font-semibold text-stone-400">
                      {user.id}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {user.canSuspend ? (
                      <UserActionForm
                        action={suspendUser}
                        userId={user.id}
                        label="정지"
                        variant="danger"
                      />
                    ) : null}
                    {user.canActivate ? (
                      <UserActionForm
                        action={activateUser}
                        userId={user.id}
                        label="활성화"
                      />
                    ) : null}
                    {!user.canSuspend && !user.canActivate ? (
                      <span className="inline-flex h-10 items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-4 text-sm font-bold text-stone-400">
                        변경 불가
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm font-semibold text-stone-500">
            표시할 유저가 없습니다.
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

function UserActionForm({
  action,
  userId,
  label,
  variant = 'primary',
}: {
  action: (formData: FormData) => Promise<void>;
  userId: string;
  label: string;
  variant?: 'primary' | 'danger';
}) {
  const className =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-action text-white hover:bg-stone-800';

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
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
