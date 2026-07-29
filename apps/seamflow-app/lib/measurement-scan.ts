// ============================================================================
// Scan-to-measurement — shared flow (docs/measurement-scan-plan.md).
//
// pick a photo → compress + upload (reusing the template-image pipeline, so
// the scan lands in the tailor-scoped `designs` bucket the server can read)
// → POST /ai/extract-measurements → structured items for the caller to land
// on an editable form. Never auto-saves anything.
//
// Used by both entry points: the template scanner (mode 'template') and the
// client-sheet scanner (mode 'measurements').
// ============================================================================

import type { AiExtractMeasurementsResponse, AiExtractMode } from '@seamflow/schemas';
import { api } from './api';
import { supabase } from './supabase';
import { pickPhoto, uploadTemplateImage } from './photo-upload';

/** Metadata of the uploaded scan photo — shaped so it can be attached to a
 *  template's `images[]` directly (same contract as uploadTemplateImage). */
export interface ScanImage {
  id: string;
  storagePath: string;
  thumbnailPath: string;
  contentType: string;
}

export interface MeasurementScan {
  image: ScanImage;
  /** Local asset uri — shows the photo instantly (review screen, overlay). */
  previewUri: string;
  extraction: AiExtractMeasurementsResponse;
}

/**
 * Run the full pick → upload → extract flow. Returns null when the tailor
 * cancels the picker. `onPicked` fires as soon as a photo is chosen so the
 * caller can raise its "Reading…" overlay while upload + extraction run.
 * Throws: picker/permission errors, upload errors, and ApiError — including
 * 503 when the server has no ANTHROPIC_API_KEY (callers show the manual
 * fallback).
 */
export async function scanMeasurementPage(args: {
  tailorId: string;
  source: 'camera' | 'library';
  mode: AiExtractMode;
  onPicked?: (previewUri: string) => void;
}): Promise<MeasurementScan | null> {
  const asset = await pickPhoto(args.source);
  if (!asset) return null;
  args.onPicked?.(asset.uri);

  const image = await uploadTemplateImage({ tailorId: args.tailorId, asset });
  const extraction = await api.ai.extractMeasurements({
    storagePath: image.storagePath,
    mode: args.mode,
  });
  return { image, previewUri: asset.uri, extraction };
}

/**
 * Best-effort cleanup of a scan the tailor chose not to keep (declined the
 * "attach photo" offer, cancelled the review). Failures are swallowed — a
 * stranded scratch file is harmless.
 */
export async function discardScanUpload(image: ScanImage): Promise<void> {
  try {
    await supabase.storage
      .from('designs')
      .remove([image.storagePath, image.thumbnailPath]);
  } catch {
    // best-effort — ignore
  }
}
