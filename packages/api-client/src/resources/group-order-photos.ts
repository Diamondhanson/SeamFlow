import type { HttpClient } from '../http';
import type {
  AttachLibraryPhotosInput,
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
     * Attach images the tailor already has, from Design Studio or My Designs.
     *
     * Sends ids, not files: the server copies the objects inside Storage, so
     * nothing is re-downloaded or re-uploaded from the phone. The copy is a
     * real copy — the original stays where it was, and the attached photo
     * survives it being deleted later.
     */
    attachFromLibrary(
      groupOrderId: string,
      input: AttachLibraryPhotosInput,
    ): Promise<GroupOrderPhoto[]> {
      return http.post<GroupOrderPhoto[]>(
        `/group-orders/${groupOrderId}/photos/from-library`,
        input,
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
