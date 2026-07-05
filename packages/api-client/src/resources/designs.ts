import type { HttpClient } from '../http';
import type {
  Design,
  DesignCreateInput,
  DesignUpdateInput,
} from '@seamflow/schemas';

export interface ListDesignsResponse {
  items: Design[];
}

export function makeDesignsResource(http: HttpClient) {
  return {
    list(): Promise<ListDesignsResponse> {
      return http.get<ListDesignsResponse>('/designs');
    },
    /**
     * Register an inspiration image that was just uploaded to the `designs`
     * Storage bucket directly from the mobile client.
     */
    create(input: DesignCreateInput): Promise<Design> {
      return http.post<Design>('/designs', input);
    },
    get(id: string): Promise<Design> {
      return http.get<Design>(`/designs/${id}`);
    },
    update(id: string, input: DesignUpdateInput): Promise<Design> {
      return http.patch<Design>(`/designs/${id}`, input);
    },
    /** Copy this design into an order's photos. */
    attachToOrder(id: string, orderId: string): Promise<{ id: string }> {
      return http.post<{ id: string }>(`/designs/${id}/attach-to-order`, { orderId });
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/designs/${id}`);
    },
  };
}

export type DesignsResource = ReturnType<typeof makeDesignsResource>;
