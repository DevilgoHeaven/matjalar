import type { Metadata } from 'next';
import Link from 'next/link';
import { approveCombo, rejectCombo } from '@/app/actions/admin/approve-combo';
import { getPendingCombos } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '조합 승인 - 맛잘알 Admin',
};

interface AdminCombosPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCombosPage({
  searchParams,
}: AdminCombosPageProps) {
  const [pendingCombos, resolvedSearchParams] = await Promise.all([
    getPendingCombos(),
    searchParams,
  ]);
  const updated = getFirstParam(resolvedSearchParams?.updated);

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 승인</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              승인 대기 조합
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              회원이 제출한 조합을 확인하고 공개 또는 반려 상태로 전환합니다.
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
              href="/admin/reports"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              신고 처리
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
            처리되었습니다.
          </p>
        ) : null}

        {pendingCombos.length ? (
          <ul className="mt-6 grid gap-4">
            {pendingCombos.map((combo) => (
              <li
                key={combo.id}
                className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-500">
                      {combo.brand.name} · {combo.menuName} · {combo.creatorNickname}
                    </p>
                    <h2 className="mt-2 text-xl font-black">{combo.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {combo.cardSummary} · {formatPrice(combo.estimatedPrice)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-stone-400">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(combo.createdAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={approveCombo}>
                      <input type="hidden" name="comboId" value={combo.id} />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-action px-4 text-sm font-black text-white transition hover:bg-stone-800"
                      >
                        공개
                      </button>
                    </form>
                  </div>
                </div>

                {combo.options.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {combo.options.map((option) => (
                      <span
                        key={option}
                        className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                ) : null}

                <form action={rejectCombo} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="comboId" value={combo.id} />
                  <input
                    name="reason"
                    required
                    maxLength={140}
                    placeholder="반려 사유"
                    className="min-h-10 flex-1 rounded-md border border-stone-300 bg-stone-50 px-3 text-sm font-semibold outline-none focus:border-action focus:bg-white focus:ring-2 focus:ring-action/10"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-700 transition hover:border-stone-500"
                  >
                    반려
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm font-semibold text-stone-500">
            승인 대기 조합이 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}
