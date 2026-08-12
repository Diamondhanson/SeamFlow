import type { HttpClient } from '../http';
import type {
  Offer,
  OfferAcceptResult,
  OfferCreateInput,
  Request,
  RequestCreateInput,
  RequestQuery,
  RequestSummary,
  RequestUpdateInput,
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

export interface ListRequestsResponse {
  items: Request[];
}
export interface ListRequestSummariesResponse {
  items: RequestSummary[];
}
export interface ListOffersResponse {
  items: Offer[];
}

/**
 * Requests — "Can you make this?" (ROADMAP appendix H).
 *
 * Split by audience on purpose. The client routes belong to a signed-in
 * consumer; the `tailor/*` routes resolve a tailor id from the same user.
 * Keeping them apart here mirrors the API and makes it obvious at a call site
 * which half of the board you are touching.
 */
export function makeRequestsResource(http: HttpClient) {
  return {
    // ---- Client ----------------------------------------------------------
    create(input: RequestCreateInput): Promise<Request> {
      return http.post<Request>('/requests', input);
    },
    listMine(): Promise<ListRequestsResponse> {
      return http.get<ListRequestsResponse>('/requests/mine');
    },
    get(id: string): Promise<Request> {
      return http.get<Request>(`/requests/${id}`);
    },
    update(id: string, input: RequestUpdateInput): Promise<Request> {
      return http.patch<Request>(`/requests/${id}`, input);
    },
    close(id: string): Promise<Request> {
      return http.post<Request>(`/requests/${id}/close`);
    },
    /** The offers on my request, for comparing. */
    offers(id: string): Promise<ListOffersResponse> {
      return http.get<ListOffersResponse>(`/requests/${id}/offers`);
    },
    shortlistOffer(offerId: string): Promise<Offer> {
      return http.post<Offer>(`/offers/${offerId}/shortlist`);
    },
    /** Pick a tailor. Opens (or reuses) the conversation they continue in. */
    acceptOffer(offerId: string): Promise<OfferAcceptResult> {
      return http.post<OfferAcceptResult>(`/offers/${offerId}/accept`);
    },

    // ---- Tailor ----------------------------------------------------------
    /**
     * The board. Everything this tailor is eligible for — invited requests
     * plus every open request in their area — with matches ranked first.
     * Specialities change the order, never the set.
     */
    listOpen(query: RequestQuery = {}): Promise<ListRequestSummariesResponse> {
      return http.get<ListRequestSummariesResponse>(
        `/tailor/requests${toQuery({
          garmentType: query.garmentType,
          minBudget: query.minBudget,
          minDaysToDeadline: query.minDaysToDeadline,
          cursor: query.cursor,
          limit: query.limit,
        })}`,
      );
    },
    getForTailor(id: string): Promise<RequestSummary> {
      return http.get<RequestSummary>(`/tailor/requests/${id}`);
    },
    makeOffer(requestId: string, input: OfferCreateInput): Promise<Offer> {
      return http.post<Offer>(`/tailor/requests/${requestId}/offers`, input);
    },
    myOffers(): Promise<ListOffersResponse> {
      return http.get<ListOffersResponse>('/tailor/offers');
    },
    withdrawOffer(offerId: string): Promise<Offer> {
      return http.post<Offer>(`/tailor/offers/${offerId}/withdraw`);
    },
  };
}

export type RequestsResource = ReturnType<typeof makeRequestsResource>;
