import type { HttpClient } from '../http';
import type {
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
