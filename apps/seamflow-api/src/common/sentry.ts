import * as Sentry from '@sentry/nestjs';

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  // Required lazily, not imported at the top of the file.
  //
  // @sentry/profiling-node ships a native .node addon that loads the moment the
  // module is imported — in every process that touches this file, including
  // tests and the 30 integration scripts, whether or not Sentry is ever
  // switched on. In a vitest worker thread that load is a segfault.
  //
  // Behind the DSN check it loads only where it is actually used, and a missing
  // or unbuildable binary degrades to Sentry-without-profiling instead of
  // taking the process down.
  // `integrations` can be an array OR a function, so narrow to the array form.
  type IntegrationList = Extract<NonNullable<Sentry.NodeOptions['integrations']>, unknown[]>;
  const integrations: IntegrationList = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const profiling = require('@sentry/profiling-node') as {
      nodeProfilingIntegration: () => IntegrationList[number];
    };
    integrations.push(profiling.nodeProfilingIntegration());
  } catch {
    // Profiling is a nice-to-have; error reporting is not.
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations,
    profilesSampleRate: 1.0,
  });
  initialized = true;
  return true;
}

export function sentryEnabled(): boolean {
  return initialized;
}

/**
 * Report a failure that was CAUGHT, so it reaches Sentry rather than only the log.
 *
 * Every scheduled job in this API catches its own errors on purpose — a cron
 * that throws would take the process down, and a nightly sweep failing is not a
 * reason to stop serving requests. The cost was that those failures went to
 * stdout and nowhere else: Sentry's Nest integration only sees exceptions that
 * go UNHANDLED, and Render's free-tier logs are short-lived and unread.
 *
 * Which meant the jobs whose silent failure matters most were exactly the ones
 * nobody would hear about — the account purge missing its window, the payment
 * reconcile quietly stopping (the blind spot finding Q-2 lived in), renewal
 * reminders never going out.
 *
 * `job` is used as a Sentry tag so one job failing repeatedly groups into one
 * issue instead of a stream of unrelated ones.
 */
export function reportJobFailure(
  job: string,
  err: unknown,
  context?: Record<string, unknown>,
): void {
  try {
    if (initialized) {
      Sentry.captureException(err, {
        tags: { job },
        extra: context,
      });
    }
  } catch {
    // Reporting a failure must never become a second failure.
  }
}
