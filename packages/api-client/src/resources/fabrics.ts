import type { HttpClient } from '../http';
import type {
  FabricResponse,
  FabricCreateInput,
  FabricUpdateInput,
} from '@seamflow/schemas';

export interface ListFabricsResponse {
  items: FabricResponse[];
}

export function makeFabricsResource(http: HttpClient) {
  return {
    list(): Promise<ListFabricsResponse> {
      return http.get<ListFabricsResponse>('/fabrics');
    },
    get(id: string): Promise<FabricResponse> {
      return http.get<FabricResponse>(`/fabrics/${id}`);
    },
    create(input: FabricCreateInput): Promise<FabricResponse> {
      return http.post<FabricResponse>('/fabrics', input);
    },
    update(id: string, input: FabricUpdateInput): Promise<FabricResponse> {
      return http.patch<FabricResponse>(`/fabrics/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/fabrics/${id}`);
    },
  };
}

export type FabricsResource = ReturnType<typeof makeFabricsResource>;
