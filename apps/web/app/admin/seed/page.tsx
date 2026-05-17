import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSeedCombo } from '@/app/actions/admin/seed-combo';
import { getSeedCatalogData, type SeedOptionGroup } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '시드 조합 등록 - 맛잘알 Admin',
};

export default async function AdminSeedPage() {
  const data = await getSeedCatalogData();
  if (!data) notFound();

  const defaultVariant =
    data.variants.find((variant) => variant.menuName === 'BMT' && variant.isDefault) ??
    data.variants[0];

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 text-action">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500">
              관리자 시드
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              {data.brand.name} 공개 조합 등록
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              로컬 검증용 공개 조합 데이터를 바로 생성합니다. 저장 후 상세 페이지로
              이동하고 브랜드 리스트도 재검증할 수 있습니다.
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
              href="/admin/users"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              유저 관리
            </Link>
            <Link
              href={`/brand/${data.brand.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-500"
            >
              브랜드 페이지
            </Link>
          </div>
        </div>

        <form action={createSeedCombo} className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-extrabold">기본 정보</h2>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-stone-700">조합명</span>
              <input
                name="title"
                required
                maxLength={60}
                defaultValue="실패없는 BMT 정석"
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-stone-700">메뉴</span>
              <select
                name="menuVariantId"
                required
                defaultValue={defaultVariant?.id}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
              >
                {data.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.menuName} {variant.variantName} ·{' '}
                    {formatPrice(variant.basePrice)}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-stone-700">운영자 추천 메모</span>
              <textarea
                name="seedComment"
                maxLength={140}
                defaultValue="처음 먹는 사람에게도 무난한 밸런스 조합입니다."
                className="mt-2 min-h-24 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium leading-6 outline-none transition focus:border-action focus:ring-2 focus:ring-action/10"
              />
            </label>

            <div className="mt-5">
              <p className="text-sm font-bold text-stone-700">태그</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700"
                  >
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={tag.slug === 'popular' || tag.slug === 'beginner'}
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
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-action px-4 text-sm font-black text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              공개 조합 생성
            </button>
          </section>

          <section className="space-y-4">
            {data.optionGroups.map((group) => (
              <OptionGroupEditor key={group.id} group={group} />
            ))}
          </section>
        </form>
      </div>
    </main>
  );
}

function OptionGroupEditor({ group }: { group: SeedOptionGroup }) {
  return (
    <fieldset className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <legend className="text-base font-extrabold">{group.name}</legend>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-stone-500">
          {group.selectionMode === 'single' ? '단일 선택' : '복수 선택'} · 최대{' '}
          {group.maxSelect}개
          {group.isRequired ? ' · 필수' : ''}
          {group.showInCard ? ' · 카드 요약 반영' : ''}
        </p>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500">
          {group.optionRole}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map((item) => (
          <label
            key={item.id}
            className="grid grid-cols-[1fr_86px] items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-3"
          >
            <span className="min-w-0 text-sm font-semibold leading-5 text-stone-800">
              {item.name}
              {item.priceDelta ? (
                <span className="ml-1 whitespace-nowrap text-xs font-bold text-stone-500">
                  +{formatPrice(item.priceDelta)}
                </span>
              ) : null}
            </span>
            <select
              name={`optionAction:${item.id}`}
              defaultValue={getDefaultAction(group, item.name)}
              className="h-9 rounded-md border border-stone-300 bg-white px-2 text-xs font-bold outline-none focus:border-action focus:ring-2 focus:ring-action/10"
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

function getDefaultAction(group: SeedOptionGroup, itemName: string) {
  const defaults: Record<string, string[]> = {
    '빵 종류': ['위트'],
    치즈: ['슈레드치즈'],
    소스: ['랜치', '스위트어니언'],
    세트여부: ['단품'],
  };
  return defaults[group.name]?.includes(itemName) ? 'select' : '';
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}
