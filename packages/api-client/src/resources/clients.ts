import type { HttpClient } from '../http';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
} from '@seamflow/schemas';

export interface ListClientsQuery {
  limit?: number;
  offset?: number;
  q?: string;
}

export interface ListClientsResponse {
  items: Client[];
  limit: number;
  offset: number;
}

export function makeClientsResource(http: HttpClient) {
  return {
    list(query: ListClientsQuery = {}): Promise<ListClientsResponse> {
      return http.get<ListClientsResponse>('/clients', query as Record<string, unknown>);
    },
    create(input: ClientCreateInput): Promise<Client> {
      return http.post<Client>('/clients', input);
    },
    get(id: string): Promise<Client> {
      return http.get<Client>(`/clients/${id}`);
    },
    update(id: string, input: ClientUpdateInput): Promise<Client> {
      return http.patch<Client>(`/clients/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/clients/${id}`);
    },
  };
}

export type ClientsResource = ReturnType<typeof makeClientsResource>;
