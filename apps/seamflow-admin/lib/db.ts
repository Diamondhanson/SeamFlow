// ============================================================================
// Read-only Postgres connection for the ops dashboard.
//
// Plain postgres.js rather than Drizzle, deliberately. Every query here is an
// aggregate across tables — counts, funnels, group-bys — and none of it maps to
// an ORM entity read. Tagged-template SQL says what it does, and it avoids
// importing the API's schema across a package boundary that TypeScript would
// have to be argued into accepting.
//
// Direct-to-Postgres rather than through the API because this tool is internal
// and read-only, and no API endpoint exposes platform-wide aggregates. Building
// admin controllers for a localhost page would mean auth plumbing for nothing.
//
// NOTHING HERE WRITES, and nothing should. A dashboard that can mutate is an
// admin tool, and an admin tool needs the auth this app deliberately lacks.
// ============================================================================

import postgres from 'postgres';
import { assertLocalOnly } from './guard';

assertLocalOnly();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'Missing DATABASE_URL — copy it from apps/seamflow-api/.env into apps/seamflow-admin/.env.local',
  );
}

// Cached on globalThis, because Next's dev server re-evaluates this module on
// every hot reload. Without the cache each edit opens a fresh pool and orphans
// the last one, and Supabase's pgBouncer answers the resulting mess with
// `CONNECTION_CLOSED` and `invalid frontend message type` — which look like
// database faults and are actually a leak in the dev loop.
//
// `prepare: false` because the pooler runs in transaction mode, where prepared
// statements do not survive between checkouts. Same setting the API uses;
// getting it wrong yields intermittent "prepared statement does not exist".
const globalForDb = globalThis as unknown as { __seamflowOpsSql?: postgres.Sql };

export const sql =
  globalForDb.__seamflowOpsSql ??
  postgres(url, {
    prepare: false,
    // Small on purpose: one reader on a shared pooler. A dashboard does not
    // need headroom and taking it starves the actual API.
    max: 3,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__seamflowOpsSql = sql;
