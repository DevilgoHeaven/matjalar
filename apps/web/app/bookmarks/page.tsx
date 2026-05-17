import type { Metadata } from 'next';
import Link from 'next/link';
import { ComboCard } from '@/components/combo/ComboCard';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getBookmarkedCombos } from './data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '찜한 조합 - 맛잘알',
};

export default async function BookmarksPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA] px-5 py-10 text-action">
        <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-bold text-gray-500">찜한 조합</p>
          <h1 className="mt-2 text-2xl font-black">로그인이 필요합니다</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            찜 목록은 회원 계정에 저장됩니다. 로그인 후 다시 열어 주세요.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-action px-5 text-sm font-black text-white transition hover:bg-gray-800"
          >
            홈으로 이동
          </Link>
        </div>
      </main>
    );
  }

  const combos = await getBookmarkedCombos(user.id);

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-5 py-8 text-action">
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-gray-200 pb-6">
          <p className="text-xs font-bold text-gray-500">내 보관함</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">찜한 조합</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            다시 먹고 싶은 조합을 빠르게 꺼내볼 수 있습니다.
          </p>
        </div>

        {combos.length ? (
          <div className="mt-6 grid gap-3">
            {combos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm font-semibold text-gray-500">
            아직 찜한 조합이 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}
