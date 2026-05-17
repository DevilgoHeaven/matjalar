import { getSupabaseServerClient } from '@/lib/supabase/server';
import { asSupabaseQueryClient } from '@/lib/supabase/query';
import { uuidSchema } from '@/lib/z-schemas/common';
import type { Database } from '@mzr/db';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;
type ComboRow = TableRow<'combos'>;
type BrandRow = TableRow<'brands'>;
type MenuRow = TableRow<'menus'>;
type MenuVariantRow = TableRow<'menu_variants'>;
type ComboStatsRow = TableRow<'combo_stats'>;
type ComboOptionRow = TableRow<'combo_options'>;
type ReviewRow = TableRow<'reviews'>;
type AppUserRow = TableRow<'app_users'>;
type BookmarkRow = TableRow<'bookmarks'>;

type ComboMetadataRow = Pick<
  ComboRow,
  'title' | 'card_summary' | 'estimated_price' | 'price_status' | 'brand_id'
>;
type ComboCoreRow = Pick<
  ComboRow,
  | 'id'
  | 'title'
  | 'card_summary'
  | 'estimated_price'
  | 'price_status'
  | 'seed_comment'
  | 'published_at'
  | 'brand_id'
  | 'primary_menu_id'
  | 'menu_variant_id'
  | 'featured_review_id'
>;
type BrandViewRow = Pick<BrandRow, 'name' | 'slug'>;
type MenuViewRow = Pick<MenuRow, 'name'>;
type VariantViewRow = Pick<MenuVariantRow, 'name' | 'base_price'>;
type StatsViewRow = Pick<
  ComboStatsRow,
  'vote_count' | 'bookmark_count' | 'review_count' | 'average_rating'
>;
type OptionViewRow = Pick<
  ComboOptionRow,
  | 'id'
  | 'action_type'
  | 'group_name_snapshot'
  | 'option_name_snapshot'
  | 'price_delta_snapshot'
  | 'quantity'
>;
type ReviewQueryRow = Pick<
  ReviewRow,
  'id' | 'user_id' | 'rating' | 'content' | 'created_at'
>;
type ProfileQueryRow = Pick<AppUserRow, 'id' | 'nickname' | 'avatar_url'>;
type ComboVoteQueryRow = Pick<TableRow<'combo_votes'>, 'id'>;
type BookmarkQueryRow = Pick<BookmarkRow, 'id'>;
type ViewerReviewQueryRow = Pick<ReviewRow, 'rating' | 'content'>;
type ViewerReviewVoteRow = Pick<TableRow<'review_votes'>, 'review_id'>;
type ReviewVoteCountRow = {
  review_id: string;
  vote_count: number;
};

export interface ComboOptionView {
  id: string;
  actionType: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
  quantity: number;
}

export interface ReviewView {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  voteCount: number;
  viewerHasVoted: boolean;
  author: {
    nickname: string;
    avatarUrl: string | null;
  };
}

export interface ComboDetail {
  id: string;
  title: string;
  cardSummary: string;
  estimatedPrice: number;
  priceStatus: string;
  seedComment: string | null;
  publishedAt: string | null;
  brand: {
    name: string;
    slug: string;
  };
  menu: {
    name: string;
    variantName: string;
    basePrice: number;
  };
  stats: {
    voteCount: number;
    bookmarkCount: number;
    reviewCount: number;
    averageRating: number;
  };
  options: ComboOptionView[];
  featuredReview: ReviewView | null;
  reviews: ReviewView[];
  viewer: {
    isSignedIn: boolean;
    hasVoted: boolean;
    hasBookmarked: boolean;
    review: {
      rating: number;
      content: string;
    } | null;
  };
}

export interface ComboMetadata {
  title: string;
  cardSummary: string;
  estimatedPrice: number;
  priceStatus: string;
  brandName: string;
}

export async function getComboMetadata(
  comboId: string
): Promise<ComboMetadata | null> {
  const parsed = uuidSchema.safeParse(comboId);
  if (!parsed.success) return null;

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const { data: combo, error: comboError } = await db
    .from('combos')
    .select<ComboMetadataRow>(
      'title, card_summary, estimated_price, price_status, brand_id'
    )
    .eq('id', parsed.data)
    .eq('status', 'published')
    .maybeSingle();

  if (comboError) throw comboError;
  if (!combo) return null;

  const { data: brand, error: brandError } = await db
    .from('brands')
    .select<Pick<BrandRow, 'name'>>('name')
    .eq('id', combo.brand_id)
    .single();

  if (brandError) throw brandError;

  return {
    title: combo.title,
    cardSummary: combo.card_summary,
    estimatedPrice: combo.estimated_price,
    priceStatus: combo.price_status,
    brandName: brand.name,
  };
}

export async function getComboDetail(comboId: string): Promise<ComboDetail | null> {
  const parsed = uuidSchema.safeParse(comboId);
  if (!parsed.success) return null;

  const supabase = await getSupabaseServerClient();
  const db = asSupabaseQueryClient(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: combo, error: comboError } = await db
    .from('combos')
    .select<ComboCoreRow>(
      'id, title, card_summary, estimated_price, price_status, seed_comment, published_at, brand_id, primary_menu_id, menu_variant_id, featured_review_id'
    )
    .eq('id', parsed.data)
    .eq('status', 'published')
    .maybeSingle();

  if (comboError) throw comboError;
  if (!combo) return null;

  const [
    brandResult,
    menuResult,
    variantResult,
    statsResult,
    optionsResult,
    reviewsResult,
    voteResult,
    bookmarkResult,
    viewerReviewResult,
  ] = await Promise.all([
    db
      .from('brands')
      .select<BrandViewRow>('name, slug')
      .eq('id', combo.brand_id)
      .single(),
    db
      .from('menus')
      .select<MenuViewRow>('name')
      .eq('id', combo.primary_menu_id)
      .single(),
    db
      .from('menu_variants')
      .select<VariantViewRow>('name, base_price')
      .eq('id', combo.menu_variant_id)
      .single(),
    db
      .from('combo_stats')
      .select<StatsViewRow>(
        'vote_count, bookmark_count, review_count, average_rating'
      )
      .eq('combo_id', combo.id)
      .maybeSingle(),
    db
      .from('combo_options')
      .select<OptionViewRow>(
        'id, action_type, group_name_snapshot, option_name_snapshot, price_delta_snapshot, quantity'
      )
      .eq('combo_id', combo.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    db
      .from('reviews')
      .select<ReviewQueryRow>('id, user_id, rating, content, created_at')
      .eq('combo_id', combo.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20),
    user
      ? db
          .from('combo_votes')
          .select<ComboVoteQueryRow>('id')
          .eq('combo_id', combo.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? db
          .from('bookmarks')
          .select<BookmarkQueryRow>('id')
          .eq('combo_id', combo.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? db
          .from('reviews')
          .select<ViewerReviewQueryRow>('rating, content')
          .eq('combo_id', combo.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  assertNoError(brandResult.error);
  assertNoError(menuResult.error);
  assertNoError(variantResult.error);
  assertNoError(statsResult.error);
  assertNoError(optionsResult.error);
  assertNoError(reviewsResult.error);
  assertNoError(voteResult.error);
  assertNoError(bookmarkResult.error);
  assertNoError(viewerReviewResult.error);

  const reviews = await enrichReviews(
    supabase,
    reviewsResult.data ?? [],
    user?.id ?? null
  );
  const featuredReview =
    reviews.find((review) => review.id === combo.featured_review_id) ??
    [...reviews].sort((a, b) => b.voteCount - a.voteCount)[0] ??
    null;

  return {
    id: combo.id,
    title: combo.title,
    cardSummary: combo.card_summary,
    estimatedPrice: combo.estimated_price,
    priceStatus: combo.price_status,
    seedComment: combo.seed_comment,
    publishedAt: combo.published_at,
    brand: {
      name: brandResult.data.name,
      slug: brandResult.data.slug,
    },
    menu: {
      name: menuResult.data.name,
      variantName: variantResult.data.name,
      basePrice: variantResult.data.base_price,
    },
    stats: {
      voteCount: statsResult.data?.vote_count ?? 0,
      bookmarkCount: statsResult.data?.bookmark_count ?? 0,
      reviewCount: statsResult.data?.review_count ?? 0,
      averageRating: statsResult.data?.average_rating ?? 0,
    },
    options: (optionsResult.data ?? []).map(toOptionView),
    featuredReview,
    reviews,
    viewer: {
      isSignedIn: Boolean(user),
      hasVoted: Boolean(voteResult.data),
      hasBookmarked: Boolean(bookmarkResult.data),
      review: viewerReviewResult.data
        ? {
            rating: viewerReviewResult.data.rating,
            content: viewerReviewResult.data.content,
          }
        : null,
    },
  };
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function toOptionView(row: OptionViewRow): ComboOptionView {
  return {
    id: row.id,
    actionType: row.action_type,
    groupName: row.group_name_snapshot,
    optionName: row.option_name_snapshot,
    priceDelta: row.price_delta_snapshot,
    quantity: row.quantity,
  };
}

async function enrichReviews(
  supabase: SupabaseServerClient,
  rows: ReviewQueryRow[],
  userId: string | null
): Promise<ReviewView[]> {
  if (rows.length === 0) return [];

  const db = asSupabaseQueryClient(supabase);
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const reviewIds = rows.map((row) => row.id);

  const [profilesResult, votesResult, viewerVotesResult] = await Promise.all([
    db
      .from('app_users')
      .select<ProfileQueryRow>('id, nickname, avatar_url')
      .in('id', userIds),
    db.rpc<ReviewVoteCountRow[]>('get_review_vote_counts', {
      p_review_ids: reviewIds,
    }),
    userId
      ? db
          .from('review_votes')
          .select<ViewerReviewVoteRow>('review_id')
          .eq('user_id', userId)
          .in('review_id', reviewIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  assertNoError(profilesResult.error);
  assertNoError(votesResult.error);
  assertNoError(viewerVotesResult.error);

  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );
  const voteCountByReviewId = new Map(
    (votesResult.data ?? []).map((vote) => [vote.review_id, vote.vote_count])
  );
  const viewerVotedReviewIds = new Set(
    (viewerVotesResult.data ?? []).map((vote) => vote.review_id)
  );

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      id: row.id,
      rating: row.rating,
      content: row.content,
      createdAt: row.created_at,
      voteCount: voteCountByReviewId.get(row.id) ?? 0,
      viewerHasVoted: viewerVotedReviewIds.has(row.id),
      author: {
        nickname: profile?.nickname ?? '맛잘알',
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  });
}
