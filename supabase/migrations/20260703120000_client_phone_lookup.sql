-- ============================================================================
-- Client phone lookup index
--
-- The contacts-based order flow materializes a client lazily: when an order is
-- created from a phone contact, the API looks for an existing client with the
-- same (tailor_id, phone) and reuses it, otherwise inserts a new one. This
-- index keeps that find-or-create lookup fast.
--
-- Deliberately NON-unique: legacy client rows predate E.164 normalization, so a
-- hard unique constraint could fail on existing near-duplicate numbers. A
-- unique index can be added later after a one-off backfill that normalizes all
-- existing phones to E.164.
-- ============================================================================

create index if not exists clients_tailor_phone_idx
  on public.clients (tailor_id, phone);
