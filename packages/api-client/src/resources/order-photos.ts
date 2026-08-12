import type { HttpClient } from '../http';
import type {
  AttachLibraryPhotosInput,
  OrderPhoto,
  OrderPhotoCreateInput,
  OrderPhotoUpdateInput,
} from '@seamflow/schemas';

export interface ListOrderPhotosResponse {
  items: OrderPhoto[];
}

export function makeOrderPhotosResource(http: HttpClient) {
  return {
    listForOrder(orderId: string): Promise<ListOrderPhotosResponse> {
      return http.get<ListOrderPhotosResponse>(`/orders/${orderId}/photos`);
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
      orderId: string,
      input: AttachLibraryPhotosInput,
    ): Promise<OrderPhoto[]> {
      return http.post<OrderPhoto[]>(`/orders/${orderId}/photos/from-library`, input);
    },
    /**
     * Register a photo that was just uploaded to Supabase Storage directly
     * from the mobile client. The server validates the path starts with the
     * tailor's id and that the object actually exists in the bucket.
     */
    createForOrder(orderId: string, input: OrderPhotoCreateInput): Promise<OrderPhoto> {
      return http.post<OrderPhoto>(`/orders/${orderId}/photos`, input);
    },
    get(id: string): Promise<OrderPhoto> {
      return http.get<OrderPhoto>(`/order-photos/${id}`);
    },
    update(id: string, input: OrderPhotoUpdateInput): Promise<OrderPhoto> {
      return http.patch<OrderPhoto>(`/order-photos/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/order-photos/${id}`);
    },
  };
}

export type OrderPhotosResource = ReturnType<typeof makeOrderPhotosResource>;
