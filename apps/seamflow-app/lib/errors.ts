// ============================================================================
// Typed app errors used for classification.
//
// The dialog error funnel (lib/dialog.tsx → lib/error-message.ts) never shows a
// raw `err.message` to users. Layers that throw carry their technical detail on
// a typed error so the mapper can recognise it and swap in friendly, localized
// copy — while the raw detail still reaches the console for debugging.
//
// Permission/offline errors live in ./permissions (they predate this file and
// carry extra state); generic upload failures live here.
// ============================================================================

/**
 * Thrown by the photo-upload layer when an image can't be encoded or stored.
 * The `message` holds technical detail (storage path, Supabase error) for logs
 * only — the mapper turns any `UploadError` into `errors.uploadFailed`, so the
 * detail is never surfaced to the user.
 */
export class UploadError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'UploadError';
  }
}
