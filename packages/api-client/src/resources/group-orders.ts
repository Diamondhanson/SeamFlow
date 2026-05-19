import type { HttpClient } from '../http';
import type {
  GroupOrder,
  GroupOrderCreateInput,
  GroupOrderStatus,
  GroupOrderUpdateInput,
  GroupOrderWithMembers,
} from '@seamflow/schemas';

export interface ListGroupOrdersQuery {
  limit?: number;
  offset?: number;
  status?: GroupOrderStatus;
}

export interface ListGroupOrdersResponse {
  items: GroupOrder[];
  limit: number;
  offset: number;
}

export function makeGroupOrdersResource(http: HttpClient) {
  return {
    list(query: ListGroupOrdersQuery = {}): Promise<ListGroupOrdersResponse> {
      return http.get<ListGroupOrdersResponse>(
        '/group-orders',
        query as Record<string, unknown>,
      );
    },
    create(input: GroupOrderCreateInput): Promise<GroupOrder> {
      return http.post<GroupOrder>('/group-orders', input);
    },
    /** GET /group-orders/:id — includes embedded members. */
    get(id: string): Promise<GroupOrderWithMembers> {
      return http.get<GroupOrderWithMembers>(`/group-orders/${id}`);
    },
    update(id: string, input: GroupOrderUpdateInput): Promise<GroupOrder> {
      return http.patch<GroupOrder>(`/group-orders/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/group-orders/${id}`);
    },
  };
}

export type GroupOrdersResource = ReturnType<typeof makeGroupOrdersResource>;
