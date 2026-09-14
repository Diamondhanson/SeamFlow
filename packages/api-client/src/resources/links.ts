import type { HttpClient } from '../http';
import type { LinkPreview } from '@seamflow/schemas';

/** Link preview (unfurl) for chat — fetches Open-Graph metadata for a URL. */
export function makeLinksResource(http: HttpClient) {
  return {
    unfurl(url: string): Promise<LinkPreview> {
      return http.post<LinkPreview>('/links/unfurl', { url });
    },
  };
}

export type LinksResource = ReturnType<typeof makeLinksResource>;
