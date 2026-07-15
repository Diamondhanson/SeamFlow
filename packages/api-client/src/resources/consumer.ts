import type { HttpClient } from '../http';
import type {
  ConsumerClaimRequest,
  ConsumerOrderSummary,
  ConsumerOrderDetail,
  ConsumerMeasurementSet,
} from '@seamflow/schemas';

export interface ListConsumerOrdersResponse {
  items: ConsumerOrderSummary[];
}
export interface ListConsumerMeasurementsResponse {
  items: ConsumerMeasurementSet[];
}

// Consumer (seamflow-client) endpoints — scoped to the signed-in user.
export function makeConsumerResource(http: HttpClient) {
  return {
    /** Claim an order from its share-link token. */
    claim(input: ConsumerClaimRequest): Promise<ConsumerOrderSummary> {
      return http.post<ConsumerOrderSummary>('/consumer/claims', input);
    },
    listOrders(): Promise<ListConsumerOrdersResponse> {
      return http.get<ListConsumerOrdersResponse>('/consumer/orders');
    },
    getOrder(id: string): Promise<ConsumerOrderDetail> {
      return http.get<ConsumerOrderDetail>(`/consumer/orders/${id}`);
    },
    listMeasurements(): Promise<ListConsumerMeasurementsResponse> {
      return http.get<ListConsumerMeasurementsResponse>('/consumer/measurements');
    },
  };
}

export type ConsumerResource = ReturnType<typeof makeConsumerResource>;
