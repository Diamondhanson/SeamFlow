import { ApiError } from '@seamflow/api-client';
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
 * the crawlers and link previewers this page exists to satisfy. If a shop ever
 * outgrows this, add a real paginated second page rather than raising it to a
 * number that makes the first paint slow on a 3G phone.
 */
export const CATALOGUE_PAGE_SIZE = 60;
