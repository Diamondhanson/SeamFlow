-- ============================================================================
-- Make the orders list as well-indexed as every other list in the app.
--
-- `orders` is the screen a tailor opens most, and it was the least covered of
-- the list endpoints:
--
--   * It sorts by `created_at DESC` and had no index that could satisfy that
--     ordering within a tailor, so every page was an index scan on tailor_id
--     followed by a sort. `tailor_works` has had
--     (tailor_id, created_at DESC, id DESC) since it was written; this is the
--     same index for the same reason.
--
--   * It filters with `ILIKE '%…%'` on order_name and had no trigram index,
--     while `clients` has had one on full_name and phone all along. The code
--     said so out loud: "Trigram GIN index on orders.order_name doesn't exist
--     yet (we'd add one if profiling shows it's hot)." Profiling cannot show it
--     at 22 rows, and by the time it can, it is a tailor's whole history.
--
-- Neither is a problem today. They are cheap now and awkward later, which is
-- the only time to add an index.
--
-- `id DESC` tiebreaks the sort so the ordering is total — two orders created in
-- the same millisecond otherwise page unstably, which is the bug that makes an
-- item appear twice while scrolling.
--
-- pg_trgm is already installed (clients uses it). Idempotent, and deliberately
-- not CONCURRENTLY: these tables are small, and a plain CREATE INDEX can run
-- inside the transaction a migration runner wraps around it.
-- ============================================================================

create index if not exists orders_tailor_created_idx
  on public.orders (tailor_id, created_at desc, id desc);

create index if not exists orders_order_name_trgm_idx
  on public.orders using gin (order_name gin_trgm_ops);
