// ============================================================================
// Crash reporting for the app — a seam, deliberately empty by default.
//
// The API has had Sentry since it was written. The app had nothing: no Sentry,
// no error boundary, no global handler. So in a release build an unhandled JS
// error closed the app with no stack, no breadcrumb and no user context, and
// the only remaining signal was a one-star review saying it "keeps closing".
//
// This module is the seam, not the integration. It mirrors the API's own
// `initSentry()`: with no DSN configured it reports nothing and costs nothing,
// so the app behaves exactly as it does today until a DSN exists. That matters
// because @sentry/react-native carries native code — adding it is a native
// rebuild, which is a decision with a release attached to it, not something to
// slip into a bug-fix pass.
//
// TO SWITCH IT ON (docs/qa-audit-plan.md, finding B-1):
//   1. npx expo install @sentry/react-native
//   2. add its config plugin to app.json (it needs the native side)
//   3. create a React Native project in Sentry — a separate one from the API's,
//      so app stack traces and server traces are not interleaved
//   4. set EXPO_PUBLIC_SENTRY_DSN in eas.json for the preview and production
//      profiles
//   5. replace the two bodies below with Sentry.init / Sentry.captureException
//   6. rebuild natively; the JS-only part of this file needs no changes
//
// Until then `report()` writes to the console in development and drops the
// error in production, which is what already happened — only now there is one
// place that decides, and one call site to change.
// ============================================================================

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True once a reporter is actually wired up. */
export function crashReportingEnabled(): boolean {
  return Boolean(DSN);
}

/**
 * Called once, as early as possible. A no-op without a DSN.
 */
export function initCrashReporting(): void {
  if (!DSN) return;
  // Step 5 above: Sentry.init({ dsn: DSN, tracesSampleRate: 0.1, ... })
}

/**
 * Report a caught error. Safe to call from anywhere, including a render-phase
 * failure — it must never throw, because the one place it is called from is a
 * component that is already handling a crash.
 */
export function reportCrash(error: unknown, context?: Record<string, unknown>): void {
  try {
    if (DSN) {
      // Step 5 above: Sentry.captureException(error, { extra: context })
      return;
    }
    if (__DEV__) {
      console.error('[crash]', error, context ?? {});
    }
  } catch {
    // A reporter that throws while reporting a crash would replace a useful
    // error with a useless one.
  }
}
