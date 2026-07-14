import type { HttpClient } from '../http';
import type {
  GroupOrderPhoto,
  GroupOrderPhotoCreateInput,
  GroupOrderPhotoUpdateInput,
} from '@seamflow/schemas';

export interface ListGroupOrderPhotosResponse {
  items: GroupOrderPhoto[];
}

export function makeGroupOrderPhotosResource(http: HttpClient) {
  return {
    listForGroup(groupOrderId: string): Promise<ListGroupOrderPhotosResponse> {
      return http.get<ListGroupOrderPhotosResponse>(
        `/group-orders/${groupOrderId}/photos`,
      );
    },
    /**
     * Register a shared reference/inspiration image that was just uploaded to
     * Supabase Storage directly from the mobile client. The server validates
     * the path starts with the tailor's id and that the object exists.
     */
    createForGroup(
      groupOrderId: string,
      input: GroupOrderPhotoCreateInput,
    ): Promise<GroupOrderPhoto> {
      return http.post<GroupOrderPhoto>(
        `/group-orders/${groupOrderId}/photos`,
        input,
      );
    },
    get(id: string): Promise<GroupOrderPhoto> {
      return http.get<GroupOrderPhoto>(`/group-order-photos/${id}`);
    },
    update(id: string, input: GroupOrderPhotoUpdateInput): Promise<GroupOrderPhoto> {
      return http.patch<GroupOrderPhoto>(`/group-order-photos/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/group-order-photos/${id}`);
    },
  };
}

export type GroupOrderPhotosResource = ReturnType<
  typeof makeGroupOrderPhotosResource
>;
