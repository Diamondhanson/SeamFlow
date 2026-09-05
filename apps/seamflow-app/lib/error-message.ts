// ============================================================================
// Error → user-facing message mapper.
//
// The single place that turns any thrown value into clear, localized copy for
// a dialog. It NEVER returns a raw `err.message`: server bodies, Supabase
// strings and stack messages are for the console, not the user. Instead it
// classifies the error (by type, then by HTTP status) and returns a friendly
// message from the `errors.*` namespace.
//
// Best-practice split (per SeamFlow notes): messages stay deliberately generic
// where a specific one would either leak internals or aid an attacker
// (auth/validation), and are as clear as possible everywhere else. Auth screens
// keep their own dedicated copy (locales/auth.ts); this mapper is the generic
// funnel every `dialog.error()` flows through.
// ============================================================================

import { ApiError } from '@seamflow/api-client';
import { PermissionDeniedError, PhotoOfflineError } from './permissions';
import { UploadError } from './errors';

// Matches the app's `t()` — kept local so this module doesn't depend on the
// i18n provider types.
type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface UserFacingError {
  title: string;
  message: string;
}

/**
 * Map any thrown value to `{ title, message }` for display. The raw error is
 * logged to the console for debugging and never shown to the user.
 */
export function toUserMessage(err: unknown, t: Translate): UserFacingError {
  // Keep the technical detail available to developers without surfacing it.
  if (__DEV__) console.warn('[SeamFlow error]', err);

  const title = t('common.error');
  const at = (key: string): UserFacingError => ({ title, message: t(key) });

  // --- Typed app errors -----------------------------------------------------
  // These are normally caught by dedicated handlers before reaching the funnel;
  // classifying them here keeps any bypassing call site friendly too.
  if (err instanceof PhotoOfflineError) return at('errors.network');
  if (err instanceof PermissionDeniedError) return at('errors.permission');
  if (err instanceof UploadError) return at('errors.uploadFailed');

  // --- API errors -----------------------------------------------------------
  if (err instanceof ApiError) {
    if (err.status === 0) return at('errors.network'); // no HTTP response / timeout
    if (err.status === 401) return at('errors.sessionExpired');
    if (err.status === 403) return at('errors.forbidden');
    if (err.status === 404) return at('errors.notFound');
    if (err.status === 409) return at('errors.conflict');
    if (err.status === 400 || err.status === 422) return at('errors.validation');
    if (err.status >= 500) return at('errors.server');
    return at('errors.unknown');
  }

  // --- Raw network failures (fetch rejects that aren't wrapped in ApiError) --
  if (err instanceof Error && /network request failed|network error/i.test(err.message)) {
    return at('errors.network');
  }

  // --- Anything else --------------------------------------------------------
  return at('errors.unknown');
}
