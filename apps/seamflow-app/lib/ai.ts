// ============================================================================
// AI image→text (auto-describe).
//
// Calls the backend POST /ai/describe-image (Claude vision). Requires the API
// server to have ANTHROPIC_API_KEY set; without it the endpoint returns 503 and
// the sheet surfaces the error.
// ============================================================================

import { useMutation } from '@tanstack/react-query';
import type {
  AiDescribeImageResponse,
  AiDescribeMode,
  AiSummarizeNotesResponse,
} from '@seamflow/schemas';
import { api } from './api';

export interface DescribeImageVars {
  /** Storage path of the image to describe. */
  storagePath: string;
  mode: AiDescribeMode;
}

export function useDescribeImage() {
  return useMutation<AiDescribeImageResponse, Error, DescribeImageVars>({
    mutationFn: ({ storagePath, mode }) =>
      api.ai.describeImage({ storagePath, mode }),
  });
}

/**
 * Tidy up rough order notes into a clean summary (Claude, text→text). Requires
 * the API to have ANTHROPIC_API_KEY set; without it the endpoint returns 503 and
 * the sheet surfaces the error.
 */
export function useSummarizeNotes() {
  return useMutation<AiSummarizeNotesResponse, Error, string>({
    mutationFn: (notes) => api.ai.summarizeNotes({ notes }),
  });
}
