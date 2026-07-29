import type { HttpClient } from '../http';
import type {
  AiDescribeImageRequest,
  AiDescribeImageResponse,
  AiExtractMeasurementsRequest,
  AiExtractMeasurementsResponse,
  AiSummarizeNotesRequest,
  AiSummarizeNotesResponse,
} from '@seamflow/schemas';

// AI endpoints (Claude). Both are fully wired on the backend; they return 503
// until the server has a funded ANTHROPIC_API_KEY.
export function makeAiResource(http: HttpClient) {
  return {
    describeImage(input: AiDescribeImageRequest): Promise<AiDescribeImageResponse> {
      return http.post<AiDescribeImageResponse>('/ai/describe-image', input);
    },
    /** Tidy a tailor's rough order notes into a clean summary. */
    summarizeNotes(input: AiSummarizeNotesRequest): Promise<AiSummarizeNotesResponse> {
      return http.post<AiSummarizeNotesResponse>('/ai/summarize-notes', input);
    },
    /** Read measurement names (and, for filled sheets, values) off a photo. */
    extractMeasurements(
      input: AiExtractMeasurementsRequest,
    ): Promise<AiExtractMeasurementsResponse> {
      return http.post<AiExtractMeasurementsResponse>('/ai/extract-measurements', input);
    },
  };
}

export type AiResource = ReturnType<typeof makeAiResource>;
