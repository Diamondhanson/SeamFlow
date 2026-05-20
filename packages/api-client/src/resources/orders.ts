import type { HttpClient } from '../http';
import type {
  Order,
  OrderCreateInput,
  OrderDetail,
  OrderStatus,
  OrderTransitionInput,
  OrderUpdateInput,
} from '@seamflow/schemas';

export interface ListOrdersQuery {
  limit?: number;
  offset?: number;
  clientId?: string;
  status?: OrderStatus;
  groupOrderId?: string;
  /** Free-text — matches order name. */
  q?: string;
  /** ISO timestamp. */
  dueBefore?: string;
  /** ISO timestamp. */
  dueAfter?: string;
}

export interface ListOrdersResponse {
  items: Order[];
  limit: number;
  offset: number;
}

export function makeOrdersResource(http: HttpClient) {
  return {
    list(query: ListOrdersQuery = {}): Promise<ListOrdersResponse> {
      return http.get<ListOrdersResponse>('/orders', query as Record<string, unknown>);
    },
    create(input: OrderCreateInput): Promise<Order> {
      return http.post<Order>('/orders', input);
    },
    /** GET /orders/:id — returns order + embedded items + recent events. */
    get(id: string): Promise<OrderDetail> {
      return http.get<OrderDetail>(`/orders/${id}`);
    },
    update(id: string, input: OrderUpdateInput): Promise<Order> {
      return http.patch<Order>(`/orders/${id}`, input);
    },
    /** Status change — validates the transition server-side and writes an event. */
    transition(id: string, input: OrderTransitionInput): Promise<Order> {
      return http.post<Order>(`/orders/${id}/transition`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/orders/${id}`);
    },
  };
}

export type OrdersResource = ReturnType<typeof makeOrdersResource>;
