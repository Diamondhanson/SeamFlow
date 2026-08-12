import type { HttpClient } from '../http';
import type {
  Client,
  CopyMemberMeasurementsInput,
  GroupOrderMember,
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  MeasurementCopyResult,
  PromoteMemberToClientInput,
  SaveMemberMeasurementsInput,
} from '@seamflow/schemas';

export interface ListGroupOrderMembersResponse {
  items: GroupOrderMember[];
}

export interface PromoteMemberToClientResponse {
  member: GroupOrderMember;
  client: Client;
}

export interface SaveMeasurementsToClientResponse {
  member: GroupOrderMember;
  measurementSetId: string;
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
    /**
     * Seeds member.measurements from the linked client's saved sets.
     *
     * Picks the set built from the garment's own template, falling back to the
     * one covering most of its fields. Pass `{ setId }` to override the pick.
     *
     * The result reports WHICH set was used and how well it fit — it used to
     * copy whatever was newest and report a flat success, which is how a
     * client's trouser measurements ended up in a gown order. Callers must
     * surface `match` rather than announcing "Copied!".
     */
    copyMeasurementsFromClient(
      id: string,
      input: CopyMemberMeasurementsInput = {},
    ): Promise<MeasurementCopyResult> {
      return http.post<MeasurementCopyResult>(
        `/group-order-members/${id}/copy-measurements-from-client`,
        input,
      );
    },
    /**
     * The reverse: keep this event's measurements on the client's own record.
     * Explicit, because a measurement taken for one event is a snapshot and
     * should not silently become the client's general record.
     */
    saveMeasurementsToClient(
      id: string,
      input: SaveMemberMeasurementsInput = {},
    ): Promise<SaveMeasurementsToClientResponse> {
      return http.post<SaveMeasurementsToClientResponse>(
        `/group-order-members/${id}/save-measurements-to-client`,
        input,
      );
    },
  };
}

export type GroupOrderMembersResource = ReturnType<typeof makeGroupOrderMembersResource>;
