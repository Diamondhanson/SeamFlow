// ============================================================================
// In-flight design uploads, held so the "describe it" screen can open the
// instant photos are picked rather than after they finish uploading.
//
// The alternative — wait for the upload, then show the form — makes the tailor
// watch a progress bar with nothing to do, and by the time they can type they
// have moved on. Starting the upload and navigating immediately means the
// waiting happens underneath the form instead of in front of it.
//
// A module-level Map rather than React state or a query cache: the promise has
// to outlive the screen that started it (the tailor can navigate away mid
// upload) and must not be re-created by a re-render. Entries are removed once
// claimed, so nothing accumulates.
// ============================================================================

import type { Work } from '@seamflow/schemas';

export interface PendingWork {
  /** Resolves to the created design once every photo has landed. */
  promise: Promise<Work>;
  /** Local preview URIs, shown while the real images upload. */
  previewUris: string[];
  /** Photos uploaded so far, for a progress line on the describe screen. */
  done: number;
  total: number;
}

const pending = new Map<string, PendingWork>();

let seq = 0;

/**
 * Register an upload and get back the key to navigate with.
 *
 * The promise is given a no-op rejection handler here so that a failed upload
 * cannot surface as an unhandled rejection while the tailor is still typing.
 * The describe screen awaits the same promise and reports the error properly.
 */
export function startPendingWork(entry: Omit<PendingWork, 'done' | 'total'> & {
  total: number;
}): string {
  const key = `pw_${++seq}`;
  entry.promise.catch(() => undefined);
  pending.set(key, { ...entry, done: 0, total: entry.total });
  return key;
}

export function getPendingWork(key: string): PendingWork | undefined {
  return pending.get(key);
}

/** Update the progress counter so a mid-upload screen can show it. */
export function setPendingProgress(key: string, done: number): void {
  const entry = pending.get(key);
  if (entry) entry.done = done;
}

/** Drop the entry once the describe screen is done with it. */
export function clearPendingWork(key: string): void {
  pending.delete(key);
}
