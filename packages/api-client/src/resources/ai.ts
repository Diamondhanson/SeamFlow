import type { HttpClient } from '../http';
import type {
  AiClassifyDesignRequest,
  AiDescribeImageRequest,
  AiDescribeImageResponse,
  AiExtractMeasurementsRequest,
  AiExtractMeasurementsResponse,
  AiSummarizeNotesRequest,
  AiSummarizeNotesResponse,
  DesignClassification,
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
    /**
     * Propose garment, colours and style for a design photo.
     *
     * Takes 5-7s and its answer is a SUGGESTION — callers should render their
     * form immediately and fold the result in when it lands, never block on
     * it. An empty result is ordinary (the model declines on an unclear photo)
     * and is not an error.
     */
    classifyDesign(input: AiClassifyDesignRequest): Promise<DesignClassification> {
      return http.post<DesignClassification>('/ai/classify-design', input);
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
