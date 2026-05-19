import type { HttpClient } from '../http';
import type {
  Client,
  GroupOrderMember,
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  PromoteMemberToClientInput,
} from '@seamflow/schemas';

export interface ListGroupOrderMembersResponse {
  items: GroupOrderMember[];
}

export interface PromoteMemberToClientResponse {
  member: GroupOrderMember;
  client: Client;
}

export function makeGroupOrderMembersResource(http: HttpClient) {
  return {
    listForGroup(groupId: string): Promise<ListGroupOrderMembersResponse> {
      return http.get<ListGroupOrderMembersResponse>(
        `/group-orders/${groupId}/members`,
      );
    },
    createForGroup(
      groupId: string,
      input: GroupOrderMemberCreateInput,
    ): Promise<GroupOrderMember> {
      return http.post<GroupOrderMember>(`/group-orders/${groupId}/members`, input);
    },
    get(id: string): Promise<GroupOrderMember> {
      return http.get<GroupOrderMember>(`/group-order-members/${id}`);
    },
    update(id: string, input: GroupOrderMemberUpdateInput): Promise<GroupOrderMember> {
      return http.patch<GroupOrderMember>(`/group-order-members/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/group-order-members/${id}`);
    },
    /** Converts an ad-hoc member into a full client and links them. */
    promoteToClient(
      id: string,
      input: PromoteMemberToClientInput,
    ): Promise<PromoteMemberToClientResponse> {
      return http.post<PromoteMemberToClientResponse>(
        `/group-order-members/${id}/promote-to-client`,
        input,
      );
    },
    /** Seeds member.measurements from the linked client's most recent set. */
    copyMeasurementsFromClient(id: string): Promise<GroupOrderMember> {
      return http.post<GroupOrderMember>(
        `/group-order-members/${id}/copy-measurements-from-client`,
      );
    },
  };
}

export type GroupOrderMembersResource = ReturnType<typeof makeGroupOrderMembersResource>;
