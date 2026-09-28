-- ============================================================================
-- Trust signals (appendix J phase 2).
--
-- The badge says a shop is REAL. These say what it has actually done, and the
-- two are deliberately kept apart (J.2): merging them would either lock out
-- every newcomer — who has no history and cannot get one without work — or
-- dilute the badge into noise. A tailor verified on day one has a badge and no
-- signals, and that is the correct reading of both.
--
-- What makes these different from everything else on a storefront: the tailor
-- cannot type them in. `TailorProfileUpdate` excludes them on purpose, because
-- a trust signal you can set yourself is not a trust signal. They are computed
-- from what actually happened.
--
-- `response_time_hours` already existed and was already read by the feed, the
-- storefront and Discover — but nothing ever WROTE it, so it has been null for
-- every shop since the column was added. This migration adds its sibling; the
-- nightly job that fills both is TrustSignalsService.
-- ============================================================================

alter table public.tailors
  add column if not exists completed_orders integer not null default 0;

comment on column public.tailors.completed_orders is
  'Orders delivered. Recomputed nightly by TrustSignalsService; never settable by the tailor.';

-- The nightly job scans messages by conversation to find reply latency. This
-- index is what keeps that from being a sequential scan of every message ever
-- sent once the table is large.
create index if not exists messages_conversation_sender_created_idx
  on public.messages (conversation_id, created_at, sender_type);

-- Counting delivered orders per tailor, nightly.
create index if not exists orders_tailor_status_idx
  on public.orders (tailor_id, status);
