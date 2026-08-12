// ============================================================================
// Query helpers shared by every section.
//
// The one design constraint that shapes all of these: the database is a
// Supabase pooler in eu-west-1, roughly 7.7s away on a cold connect and 0.3–1s
// per query warm. So the rule is ONE ROUND TRIP PER PAGE. Every section's
// query file exposes a single exported function that returns everything that
// page needs, assembled by Postgres as JSON.
//
// The first version of this dashboard fanned seven queries out in parallel and
// took 40–60 seconds to render. It was not the queries that were slow.
// ============================================================================

import { sql } from '../db';

export type Sql = typeof sql;

/** A month bucket in a time series. */
export interface Bucket {
  key: string;
  label: string;
  value: number;
}

/**
 * How far back a page is looking, as a SQL fragment that is either a real
 * predicate or literally `true`.
 *
 * Returning `true` rather than an empty string keeps every call site the same
 * shape — `where ... and ${range(...)}` — so there is no branch in the query
 * text and no chance of producing `where and`.
 */
export function rangeFilter(column: string, days: number | null) {
  if (!days) return sql`true`;
  return sql`${sql(column)} >= now() - make_interval(days => ${days})`;
}

export function parseRange(v: string | undefined): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Twelve months of buckets with zeroes where nothing happened.
 *
 * The zeroes matter. A series built by grouping rows only produces months that
 * have data, so a quiet July silently vanishes and the chart draws June
 * straight to August — which reads as continuity when it means a gap.
 */
export function monthlySeries(table: string, column: string, months = 12, where = sql`true`) {
  return sql`
    select
      to_char(m, 'YYYY-MM')      as key,
      to_char(m, 'Mon')          as label,
      count(t.*)::int            as value
    from generate_series(
           date_trunc('month', now()) - make_interval(months => ${months - 1}),
           date_trunc('month', now()),
           interval '1 month'
         ) m
    left join ${sql(table)} t
      on date_trunc('month', t.${sql(column)}) = m and ${where}
    group by m
    order by m
  `;
}

/** Postgres bigint/numeric arrive as strings; every count goes through this. */
export const n = (v: unknown): number => Number(v ?? 0);

/** `%term%` for ILIKE, with the wildcards the user typed escaped. */
export const like = (term: string): string => `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

export const PAGE_SIZE = 40;

export function parsePage(v: string | undefined): number {
  const p = Number(v);
  return Number.isFinite(p) && p > 1 ? Math.floor(p) : 1;
}
