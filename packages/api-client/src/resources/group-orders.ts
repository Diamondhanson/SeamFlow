import type { HttpClient } from '../http';
import type {
  GroupOrder,
  GroupOrderCreateInput,
  GroupOrderStatus,
  GroupOrderUpdateInput,
  GroupOrderWithMembers,
  GroupOrderWithMembersCreateInput,
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
    /**
     * Atomic create — server resolves owner (existing or new contact) and
     * inserts members in a single transaction. Returns the full group +
     * members payload.
     */
    createWithMembers(
      input: GroupOrderWithMembersCreateInput,
    ): Promise<GroupOrderWithMembers> {
      return http.post<GroupOrderWithMembers>('/group-orders/with-members', input);
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
