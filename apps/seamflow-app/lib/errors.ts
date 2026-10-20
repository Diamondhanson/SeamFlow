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

/**
 * Thrown when a recording will not play.
 *
 * Separate from `UploadError` because the apology is different: a note that
 * cannot be PLAYED has not failed to send, and telling someone we could not
 * send their message when the file is sitting there ready is both wrong and
 * alarming. The `message` carries the reason the browser gave, for the console.
 */
export class PlaybackError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'PlaybackError';
  }
}
