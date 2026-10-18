import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration()],
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
