import type { HttpClient } from '../http';
import type {
  AiDescribeImageRequest,
  AiDescribeImageResponse,
} from '@seamflow/schemas';

// AI image→text. The backend endpoint POST /ai/describe-image is NOT built yet
// (M3). This resource exists so the contract is defined and the mobile app can
// swap its local stub for `api.ai.describeImage(...)` once Claude is wired up.
export function makeAiResource(http: HttpClient) {
  return {
    describeImage(input: AiDescribeImageRequest): Promise<AiDescribeImageResponse> {
      return http.post<AiDescribeImageResponse>('/ai/describe-image', input);
    },
  };
}

export type AiResource = ReturnType<typeof makeAiResource>;
