import type { HttpClient } from '../http';
import type {
  Work,
  WorkAdoptInput,
  WorkCreateInput,
  WorkImagesAddInput,
  WorkFacets,
  WorkPage,
  WorkPublishInput,
  WorkQuery,
  WorkUpdateInput,
} from '@seamflow/schemas';

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
 * "My Designs" — the tailor's portfolio of work they actually made
 * (distinct from `designs`, which is the Design Studio's inspiration library).
 *
 * Every call here is tailor-authenticated; nothing in this resource is public.
 * A piece becomes publicly visible only via `publish`, which copies a
 * derivative into the public feed bucket. `unpublish` deletes that copy again.
 */
export function makeWorksResource(http: HttpClient) {
  return {
    list(query: Partial<WorkQuery> = {}): Promise<WorkPage> {
      return http.get<WorkPage>(
        `/works${toQuery(query as Record<string, string | number | undefined>)}`,
      );
    },
    /** Attribute values actually present, so filters never offer an empty result. */
    facets(): Promise<WorkFacets> {
      return http.get<WorkFacets>('/works/facets');
    },
    get(id: string): Promise<Work> {
      return http.get<Work>(`/works/${id}`);
    },
    /**
     * Register images already uploaded to the private `works` bucket, as one
     * design. The first entry becomes the cover.
     */
    create(input: WorkCreateInput): Promise<Work> {
      return http.post<Work>('/works', input);
    },

    /** Append more angles to an existing design. */
    addImages(id: string, input: WorkImagesAddInput): Promise<Work> {
      return http.post<Work>(`/works/${id}/images`, input);
    },
    /** Drop one angle. The API refuses to remove the last remaining photo. */
    removeImage(id: string, imageId: string): Promise<Work> {
      return http.delete<Work>(`/works/${id}/images/${imageId}`);
    },
    /** Promote one angle to the cover — what the grid and the feed show. */
    setCoverImage(id: string, imageId: string): Promise<Work> {
      return http.patch<Work>(`/works/${id}/images/${imageId}/cover`, {});
    },
    /** Pull a finished order's photo into the portfolio. Idempotent. */
    adoptOrderPhoto(orderPhotoId: string, input: WorkAdoptInput = {}): Promise<Work> {
      return http.post<Work>(`/order-photos/${orderPhotoId}/adopt`, input);
    },
    update(id: string, input: WorkUpdateInput): Promise<Work> {
      return http.patch<Work>(`/works/${id}`, input);
    },
    remove(id: string): Promise<void> {
      return http.delete<void>(`/works/${id}`);
    },
    publish(id: string, input: WorkPublishInput = {}): Promise<Work> {
      return http.post<Work>(`/works/${id}/publish`, input);
    },
    unpublish(id: string): Promise<Work> {
      return http.post<Work>(`/works/${id}/unpublish`, {});
    },
  };
}

export type WorksResource = ReturnType<typeof makeWorksResource>;
