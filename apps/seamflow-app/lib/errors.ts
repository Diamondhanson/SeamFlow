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
 * Thrown by the upload layer when something can't be encoded or stored.
 *
 * The `message` holds technical detail (storage path, Supabase error) for logs
 * only; the mapper turns this into a friendly line and the detail is never
 * surfaced. `kind` picks WHICH line: a voice note that fails to send used to
 * apologise for not uploading a photo, which is confusing at exactly the
 * moment someone is already confused.
 */
export class UploadError extends Error {
  constructor(
    detail: string,
    public readonly kind: 'photo' | 'voice' = 'photo',
  ) {
    super(detail);
    this.name = 'UploadError';
  }
}
