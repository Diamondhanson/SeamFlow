import type { HttpClient } from '../http';
import type {
  OrderItem,
  OrderItemCreateInput,
  OrderItemUpdateInput,
} from '@seamflow/schemas';

export interface ListOrderItemsResponse {
  items: OrderItem[];
}

export function makeOrderItemsResource(http: HttpClient) {
  return {
    listForOrder(orderId: string): Promise<ListOrderItemsResponse> {
      return http.get<ListOrderItemsResponse>(`/orders/${orderId}/items`);
    },
    createForOrder(orderId: string, input: OrderItemCreateInput): Promise<OrderItem> {
      return http.post<OrderItem>(`/orders/${orderId}/items`, input);
    },
    get(id: string): Promise<OrderItem> {
      return http.get<OrderItem>(`/order-items/${id}`);
    },
    update(id: string, input: OrderItemUpdateInput): Promise<OrderItem> {
      return http.patch<OrderItem>(`/order-items/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/order-items/${id}`);
    },
  };
}

export type OrderItemsResource = ReturnType<typeof makeOrderItemsResource>;
