import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageEvents } from '@/components/analytics/PageEvents';
import { DuplicateAwareComboForm } from '@/components/combo/DuplicateAwareComboForm';
import { RegisterLoginButton } from '@/components/combo/RegisterLoginButton';
import { ensureAppUserExists } from '@/lib/auth/ensure-app-user';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/z-schemas/common';
import { getComboFormCatalog, type ComboFormCatalog } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '조합 등록 - 맛잘알',
};

interface ComboNewPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ComboNewPage({ searchParams }: ComboNewPageProps) {
  const [{ data: auth }, catalog, resolvedSearchParams] = await Promise.all([
    (await getSupabaseServerClient()).auth.getUser(),
    getComboFormCatalog(),
    searchParams,
  ]);
  if (!catalog) notFound();

  const submitted = getFirstParam(resolvedSearchParams?.submitted) === '1';
  const submittedComboId = parseSubmittedComboId(
    getFirstParam(resolvedSearchParams?.comboId)
  );
  if (!auth.user) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA] px-5 py-10 text-action">
        <PageEvents events={[{ type: 'page_view', pathname: '/combo/new' }]} />
        <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-bold text-gray-500">조합 등록</p>
          <h1 className="mt-2 text-2xl font-black">로그인이 필요합니다</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            조합 등록은 회원만 가능합니다. 로그인 후 작성하던 흐름으로 바로
            돌아올 수 있습니다.
          </p>
          <div className="mt-5">
            <RegisterLoginButton />
          </div>
        </div>
      </main>
    );
  }

  await ensureAppUserExists();
  const defaultVariant =
    catalog.variants.find((variant) => variant.menuName === 'BMT' && variant.isDefault) ??
    catalog.variants[0];

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-5 py-8 text-action">
      <PageEvents
        events={[
          { type: 'page_view', pathname: '/combo/new' },
          ...(submitted && submittedComboId
            ? [
                {
                  type: 'combo_register_submitted' as const,
                  combo_id: submittedComboId,
                },
              ]
            : [{ type: 'combo_register_started' as const }]),
        ]}
      />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">조합 등록</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              {catalog.brand.name} 꿀조합 제보
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              제출한 조합은 승인 대기 상태로 저장됩니다. 관리자가 확인하면
              브랜드 페이지와 상세 페이지에 공개됩니다.
            </p>
          </div>
          <Link
            href={`/brand/${catalog.brand.slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 transition hover:border-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            브랜드 페이지
          </Link>
        </div>

        {submitted ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700"
          >
            조합이 승인 대기함에 저장되었습니다.
          </p>
        ) : null}

        <DuplicateAwareComboForm className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-extrabold">기본 정보</h2>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-gray-700">조합명</span>
              <input
                name="title"
                required
                maxLength={60}
                placeholder="예: 실패없는 BMT 정석"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-gray-700">메뉴</span>
              <select
                name="menuVariantId"
                required
                defaultValue={defaultVariant?.id}
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
              >
                {catalog.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.menuName} {variant.variantName} ·{' '}
                    {formatPrice(variant.basePrice)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5">
              <p className="text-sm font-bold text-gray-700">태그</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {catalog.tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700"
                  >
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      className="h-3.5 w-3.5 accent-action"
                    />
                    <span>
                      {tag.emoji ? `${tag.emoji} ` : ''}
                      {tag.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-action px-4 text-sm font-black text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              승인 대기 등록
            </button>
          </section>

          <section className="space-y-4">
            {catalog.optionGroups.map((group) => (
              <OptionGroupEditor key={group.id} group={group} />
            ))}
          </section>
        </DuplicateAwareComboForm>
      </div>
    </main>
  );
}

function OptionGroupEditor({
  group,
}: {
  group: ComboFormCatalog['optionGroups'][number];
}) {
  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <legend className="text-base font-extrabold">{group.name}</legend>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500">
          {group.selectionMode === 'single' ? '단일 선택' : '복수 선택'} · 최대{' '}
          {group.maxSelect}개
          {group.isRequired ? ' · 필수' : ''}
          {group.showInCard ? ' · 카드 요약 반영' : ''}
        </p>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
          {group.optionRole}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map((item) => (
          <label
            key={item.id}
            className="grid grid-cols-[1fr_86px] items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <span className="min-w-0 text-sm font-semibold leading-5 text-gray-800">
              {item.name}
              {item.priceDelta ? (
                <span className="ml-1 whitespace-nowrap text-xs font-bold text-gray-500">
                  +{formatPrice(item.priceDelta)}
                </span>
              ) : null}
            </span>
            <select
              name={`optionAction:${item.id}`}
              defaultValue={getDefaultAction(group.name, item.name)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs font-bold outline-none focus:border-action focus:ring-2 focus:ring-action/10"
            >
              <option value="">미사용</option>
              <option value="select">선택</option>
              <option value="exclude">빼기</option>
              <option value="add">추가</option>
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function getDefaultAction(groupName: string, itemName: string) {
  const defaults: Record<string, string[]> = {
    '빵 종류': ['위트'],
    세트여부: ['단품'],
  };
  return defaults[groupName]?.includes(itemName) ? 'select' : '';
}

function getFirstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}

function parseSubmittedComboId(value: string | null) {
  if (!value) return null;
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}
