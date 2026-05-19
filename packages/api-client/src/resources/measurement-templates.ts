import type { HttpClient } from '../http';
import type {
  MeasurementTemplate,
  MeasurementTemplateCreateInput,
  MeasurementTemplateUpdateInput,
} from '@seamflow/schemas';

export interface ListMeasurementTemplatesResponse {
  items: MeasurementTemplate[];
}

export function makeMeasurementTemplatesResource(http: HttpClient) {
  return {
    list(): Promise<ListMeasurementTemplatesResponse> {
      return http.get<ListMeasurementTemplatesResponse>('/measurement-templates');
    },
    create(input: MeasurementTemplateCreateInput): Promise<MeasurementTemplate> {
      return http.post<MeasurementTemplate>('/measurement-templates', input);
    },
    get(id: string): Promise<MeasurementTemplate> {
      return http.get<MeasurementTemplate>(`/measurement-templates/${id}`);
    },
    update(
      id: string,
      input: MeasurementTemplateUpdateInput,
    ): Promise<MeasurementTemplate> {
      return http.patch<MeasurementTemplate>(`/measurement-templates/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/measurement-templates/${id}`);
    },
  };
}

export type MeasurementTemplatesResource = ReturnType<typeof makeMeasurementTemplatesResource>;
