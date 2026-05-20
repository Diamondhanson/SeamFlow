import type { HttpClient } from '../http';
import type { PublicOrderResponse, ShareLinkResponse } from '@seamflow/schemas';

export function makeShareLinksResource(http: HttpClient) {
  return {
    /** Mint a fresh share link for one of the caller's orders. */
    issueForOrder(orderId: string): Promise<ShareLinkResponse> {
      return http.post<ShareLinkResponse>(`/orders/${orderId}/share-link`);
    },
    /**
     * Resolve a public share token (no auth header sent — see {@link makePublicClient}
     * for an unauthed client to use server-side from the marketing/web app).
     * This method still works from the authed mobile client; the API just
     * ignores the JWT on the public route.
     */
    resolvePublic(token: string): Promise<PublicOrderResponse> {
      return http.get<PublicOrderResponse>(`/public/orders/${encodeURIComponent(token)}`);
    },
  };
}

export type ShareLinksResource = ReturnType<typeof makeShareLinksResource>;
