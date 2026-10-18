// ============================================================================
// When the scheduled jobs run, and the assumption they all rest on.
//
// TIMEZONE. Every @Cron in this API pins this explicitly. Without it, a cron
// expression means the HOST's clock: UTC on Render today, but nothing in the
// code said so, and a region move or a change of base image would have shifted
// every job silently — including the 09:00 renewal reminder, which is the one
// a tailor actually notices.
//
// UTC rather than Africa/Douala, even though that is where most tailors are,
// because these are infrastructure jobs and UTC is what the logs, the host and
// the database all already speak. The one job with an opinion about local time
// is the renewal reminder: 09:00 UTC is 10:00 in Douala, which is fine, and if
// that should become 09:00 local it is a deliberate product change, not a
// default to leave to the host.
//
// ONE INSTANCE. These jobs run in-process with no lease and no lock, so a
// second instance of the API runs every one of them a second time. Most are
// idempotent enough to survive it; `renewalReminders` is not — it has no
// dedupe, so every tailor would get the expiry email and push twice.
//
// Cross-instance dedupe needs durable state, and the usual trick of a Postgres
// advisory lock is not available here: the connection goes through pgBouncer in
// TRANSACTION mode (see db.service.ts), where a session-level lock is not held
// to the session that took it. So it needs a lease table — a schema change,
// which is queued behind the migration-history repair.
//
// Until that lands, running more than one instance of this API will duplicate
// the billing emails. That is the trade recorded here so it is a decision
// rather than a surprise.
// ============================================================================

/** The timezone every scheduled job in this API is pinned to. */
export const CRON_TZ = 'UTC';
