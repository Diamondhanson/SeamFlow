import type { HttpClient } from '../http';
import type {
  CatalogueLink,
  FeedPage,
  FeedPost,
  FeedPostCreateInput,
  FeedPostDetail,
  FeedPostUpdateInput,
  FeedQuery,
  TailorPublicProfile,
  Work,
} from '@seamflow/schemas';

export interface StorefrontResponse {
  tailor: TailorPublicProfile;
  posts: FeedPage;
}

export interface ListMyFeedPostsResponse {
  items: FeedPost[];
}

/** Drop undefined/empty values so we don't send `?city=undefined`. */
function toQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * Discovery feed (ROADMAP D.2.1 / D.2.2).
 *
 * The three `GET` reads are public — they work with no Authorization header,
 * which is what lets the client app render the feed before sign-in (D-4). The
 * publish/manage calls require the owning tailor.
 */
export function makeFeedResource(http: HttpClient) {
  return {
    /** Public. Keyset-paginated; pass the previous page's `nextCursor`. */
    list(query: Partial<FeedQuery> = {}): Promise<FeedPage> {
      return http.get<FeedPage>(`/feed${toQuery(query as Record<string, string | number | undefined>)}`);
    },
    /** Public. One post plus (later) visually similar work. */
    get(id: string): Promise<FeedPostDetail> {
      return http.get<FeedPostDetail>(`/feed/${id}`);
    },
    /** Public. A tailor's storefront: profile header + their published work. */
    storefront(tailorId: string, query: Partial<FeedQuery> = {}): Promise<StorefrontResponse> {
      return http.get<StorefrontResponse>(
        `/tailors/${tailorId}/storefront${toQuery(query as Record<string, string | number | undefined>)}`,
      );
    },

    /**
     * Public. The same storefront, addressed by the tailor's catalogue slug.
     *
     * This is what `/t/<slug>` resolves to, on the web and in the client app
     * alike. Prefer it over `storefront(tailorId)` whenever you arrived from a
     * shared link, so both surfaces read one source.
     */
    storefrontBySlug(slug: string, query: Partial<FeedQuery> = {}): Promise<StorefrontResponse> {
      return http.get<StorefrontResponse>(
        `/public/tailors/${encodeURIComponent(slug)}/catalogue${toQuery(query as Record<string, string | number | undefined>)}`,
      );
    },

    /**
     * Tailor-only. This shop's permanent catalogue link, minting the slug on
     * first call. Safe to call on every tap of Share — after the first, it is
     * a plain read and always returns the same URL.
     */
    catalogueLink(): Promise<CatalogueLink> {
      return http.post<CatalogueLink>('/me/catalogue-link', {});
    },

    /**
     * Tailor-only. Publish a completed order photo to the public feed. The
     * server copies derivatives into the public bucket — the private original
     * is never exposed.
     */
    publishOrderPhoto(orderPhotoId: string, input: FeedPostCreateInput): Promise<Work> {
      // Returns a Work, not a FeedPost: publishing from an order adopts the
      // photo into the tailor's portfolio first (see FeedController.publish).
      return http.post<Work>(`/order-photos/${orderPhotoId}/publish`, input);
    },
    /** Tailor-only. Edit metadata, or publish/unpublish via `status`. */
    update(id: string, input: FeedPostUpdateInput): Promise<FeedPost> {
      return http.patch<FeedPost>(`/feed-posts/${id}`, input);
    },
    /** Tailor-only. Permanently remove a post (the copied images go too). */
    remove(id: string): Promise<void> {
      return http.delete<void>(`/feed-posts/${id}`);
    },
    /** Tailor-only. Everything this tailor has published, including hidden. */
    mine(): Promise<ListMyFeedPostsResponse> {
      return http.get<ListMyFeedPostsResponse>('/feed-posts/mine');
    },
  };
}

export type FeedResource = ReturnType<typeof makeFeedResource>;
