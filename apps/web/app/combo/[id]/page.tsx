import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_TOKENS } from '@mzr/ui';
import { PageEvents } from '@/components/analytics/PageEvents';
import { BookmarkButton } from '@/components/combo/BookmarkButton';
import { FeaturedReview } from '@/components/combo/FeaturedReview';
import { ReportButton } from '@/components/combo/ReportButton';
import { ReceiptBox } from '@/components/combo/ReceiptBox';
import { ReviewForm } from '@/components/combo/ReviewForm';
import { ReviewList } from '@/components/combo/ReviewList';
import { VoteButton } from '@/components/combo/VoteButton';
import {
  getComboDetail,
  getComboMetadata,
} from './data';

export const dynamic = 'force-dynamic';

interface ComboPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ComboPageProps): Promise<Metadata> {
  const { id } = await params;
  const combo = await getComboMetadata(id);

  if (!combo) {
    return {
      title: '조합을 찾을 수 없어요 — 맛잘알',
    };
  }

  const title = `${combo.title} — 맛잘알`;
  const description = `${combo.brandName} · ${combo.cardSummary} · ${formatPrice(
    combo.estimatedPrice,
    combo.priceStatus
  )}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function ComboDetailPage({ params }: ComboPageProps) {
  const { id } = await params;
  const combo = await getComboDetail(id);

  if (!combo) notFound();

  const featuredReviewId = combo.featuredReview?.id;
  const gradient = CATEGORY_TOKENS.fastfood.gradient;

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <PageEvents
        events={[
          { type: 'page_view', pathname: `/combo/${combo.id}` },
          { type: 'detail_view', combo_id: combo.id },
        ]}
      />
      <section
        className="px-5 pb-8 pt-6"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        }}
      >
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/brand/${combo.brand.slug}`}
            className="text-sm font-semibold text-action/70 underline-offset-4 hover:underline"
          >
            {combo.brand.name}
          </Link>
          <h1 className="mt-5 text-3xl font-black leading-tight text-action sm:text-4xl">
            {combo.title}
          </h1>
          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-action/75">
            {combo.cardSummary}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <VoteButton
              comboId={combo.id}
              initialVoted={combo.viewer.hasVoted}
              initialVoteCount={combo.stats.voteCount}
              isSignedIn={combo.viewer.isSignedIn}
            />
            <BookmarkButton
              comboId={combo.id}
              initialBookmarked={combo.viewer.hasBookmarked}
              initialBookmarkCount={combo.stats.bookmarkCount}
              isSignedIn={combo.viewer.isSignedIn}
            />
            <div className="flex min-h-11 items-center gap-3 rounded-full bg-white/70 px-4 text-sm font-semibold text-action">
              <span>별점 {combo.stats.averageRating.toFixed(1)}</span>
              <span className="h-4 w-px bg-action/20" />
              <span>후기 {combo.stats.reviewCount}</span>
            </div>
            <ReportButton
              targetType="combo"
              targetId={combo.id}
              isSignedIn={combo.viewer.isSignedIn}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-2xl gap-6 px-5 py-6">
        <ReceiptBox
          menuName={combo.menu.name}
          variantName={combo.menu.variantName}
          basePrice={combo.menu.basePrice}
          options={combo.options}
          estimatedPrice={combo.estimatedPrice}
          priceStatus={combo.priceStatus}
        />

        <FeaturedReview
          review={combo.featuredReview}
          seedComment={combo.seedComment}
          comboId={combo.id}
          isSignedIn={combo.viewer.isSignedIn}
        />

        <ReviewForm
          comboId={combo.id}
          isSignedIn={combo.viewer.isSignedIn}
          initialReview={combo.viewer.review}
        />

        <ReviewList
          reviews={combo.reviews}
          featuredReviewId={featuredReviewId}
          comboId={combo.id}
          isSignedIn={combo.viewer.isSignedIn}
        />
      </div>
    </main>
  );
}

function formatPrice(value: number, status: string) {
  if (status === 'unknown') return '가격 확인중';
  const price = `${new Intl.NumberFormat('ko-KR').format(value)}원`;
  return status === 'exact' ? price : `약 ${price}`;
}
