import { ApiError } from '@seamflow/api-client';
import { FEED_MAX_LIMIT } from '@seamflow/schemas';
import type { FeedPostPublic, TailorPublicProfile } from '@seamflow/schemas';
import { publicApi } from './api';

export interface CataloguePayload {
  tailor: TailorPublicProfile;
  posts: FeedPostPublic[];
}

/**
 * Load one catalogue, or null when there is nothing at that address.
 *
 * Returns null on 404 rather than throwing so both the page and its
 * `generateMetadata` can handle "no such shop" the same way. They run as
 * separate invocations, and a metadata function that throws produces a broken
 * <head> on a page that would otherwise render its own not-found state.
 *
 * Everything else rethrows: a 500 from the API must surface as a 500 here, not
 * be flattened into "this shop does not exist".
 */
export async function loadCatalogue(slug: string): Promise<CataloguePayload | null> {
  try {
    const res = await publicApi().feed.storefrontBySlug(slug, { limit: CATALOGUE_PAGE_SIZE });
    return { tailor: res.tailor, posts: res.posts.items };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * How many pieces the page renders.
 *
 * One server-rendered wall, no infinite scroll. A tailor's catalogue is tens
 * of pieces, not thousands, and a scroll-to-load gallery would be invisible to
 * the crawlers and link previewers this page exists to satisfy.
 *
 * Pinned to the API's own ceiling rather than a hand-picked number: asking for
 * more is a 400, and because a validation failure is a bug rather than a
 * missing shop, `loadCatalogue` rethrows it and the whole page 500s. If a shop
 * outgrows one page, add a real second page — do not raise this.
 */
export const CATALOGUE_PAGE_SIZE = FEED_MAX_LIMIT;
