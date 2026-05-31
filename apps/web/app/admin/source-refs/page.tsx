import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getAdminSourceRefData } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '데이터 신뢰도 - 맛잘알 Admin',
};

export default async function AdminSourceRefsPage() {
  const data = await getAdminSourceRefData();

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">관리자 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              데이터 신뢰도
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              공식·운영자·커뮤니티·뉴스·가격 추적 출처를 확인하고 exact 가격 근거를 점검합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminLink href="/admin">대시보드</AdminLink>
            <AdminLink href="/admin/corrections">최근 제보</AdminLink>
            <AdminLink href="/admin/analytics">성장 지표</AdminLink>
          </div>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="최근 출처" value={data.counts.total} />
          <MetricCard label="확인됨" value={data.counts.confirmed} />
          <MetricCard label="추정 근거" value={data.counts.approx} />
          <MetricCard label="미검증" value={data.counts.unverified} />
          <MetricCard label="공식가" value={data.counts.exactPrice} />
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">최근 출처 100건</h2>
          {data.refs.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-stone-50 text-xs font-black text-stone-500">
                  <tr>
                    <th className="px-3 py-2">대상</th>
                    <th className="px-3 py-2">출처</th>
                    <th className="px-3 py-2">신뢰도</th>
                    <th className="px-3 py-2">가격</th>
                    <th className="px-3 py-2">확인일</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refs.map((ref) => (
                    <tr key={ref.id} className="border-t border-stone-200">
                      <td className="px-3 py-3">
                        <p className="font-black">{formatTargetType(ref.targetType)}</p>
                        <p className="mt-1 break-all text-xs font-semibold text-stone-500">
                          {ref.targetId}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {ref.sourceUrl ? (
                          <a
                            href={ref.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline-offset-4 hover:underline"
                          >
                            {ref.title}
                          </a>
                        ) : (
                          <span className="font-bold">{ref.title}</span>
                        )}
                        <p className="mt-1 text-xs font-semibold text-stone-500">
                          {formatSourceKind(ref.sourceKind)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill value={formatConfidence(ref.confidence)} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill value={formatPriceStatus(ref.priceStatus)} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-stone-500">
                        {formatDate(ref.observedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-semibold text-stone-500">
              등록된 출처가 없습니다.
            </p>
          )}
        </section>
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-black text-stone-600">
      {value}
    </span>
  );
}

function formatTargetType(value: string) {
  const labels: Record<string, string> = {
    brand: '브랜드',
    menu: '메뉴',
    menu_variant: '메뉴 변형',
    option_item: '옵션',
    combo: '조합',
  };
  return labels[value] ?? value;
}

function formatSourceKind(value: string) {
  const labels: Record<string, string> = {
    official: '공식',
    operator_check: '운영자 확인',
    community: '커뮤니티',
    news: '뉴스',
    price_tracker: '가격 추적',
  };
  return labels[value] ?? value;
}

function formatConfidence(value: string) {
  const labels: Record<string, string> = {
    confirmed: '확인됨',
    approx: '추정',
    unverified: '미검증',
  };
  return labels[value] ?? value;
}

function formatPriceStatus(value: string) {
  const labels: Record<string, string> = {
    exact: '공식가',
    approx: '추정가',
    unknown: '확인중',
  };
  return labels[value] ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
