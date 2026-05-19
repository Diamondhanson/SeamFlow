import type { HttpClient } from '../http';
import type {
  MeasurementSet,
  MeasurementSetCreateInput,
  MeasurementSetUpdateInput,
} from '@seamflow/schemas';

export interface ListMeasurementSetsResponse {
  items: MeasurementSet[];
}

export function makeMeasurementSetsResource(http: HttpClient) {
  return {
    listForClient(clientId: string): Promise<ListMeasurementSetsResponse> {
      return http.get<ListMeasurementSetsResponse>(
        `/clients/${clientId}/measurement-sets`,
      );
    },
    createForClient(
      clientId: string,
      input: MeasurementSetCreateInput,
    ): Promise<MeasurementSet> {
      return http.post<MeasurementSet>(`/clients/${clientId}/measurement-sets`, input);
    },
    get(id: string): Promise<MeasurementSet> {
      return http.get<MeasurementSet>(`/measurement-sets/${id}`);
    },
    update(id: string, input: MeasurementSetUpdateInput): Promise<MeasurementSet> {
      return http.patch<MeasurementSet>(`/measurement-sets/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/measurement-sets/${id}`);
    },
  };
}

export type MeasurementSetsResource = ReturnType<typeof makeMeasurementSetsResource>;
