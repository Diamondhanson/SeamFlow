-- ============================================================================
-- Phone verification: make room for a vendor that owns the code.
--
-- The table was written for one kind of provider — a courier that delivers a
-- code we minted, whose HMAC we keep in `code_hash`. Didit is the other kind:
-- it generates the code, sends it, and judges it, and we never see the digits.
-- There is therefore nothing to hash, and `code_hash` has to be nullable.
--
-- The invariant is now "exactly one of these two is set":
--
--   code_hash    → we own the code, we compare it ourselves
--   provider_ref → the vendor owns it, and this is their handle on the session
--
-- That is deliberately NOT a check constraint. A row is inserted before the
-- send in one mode and after it in the other, and a constraint that can only
-- ever fire during a vendor wobble would turn a retryable failure into a 500.
-- The service enforces it; see phone-verification.service.ts.
--
-- `risk` is what the vendor learned about the line while verifying it: carrier,
-- line type, whether it is VoIP or disposable, which channel actually carried
-- the message, and how many other accounts have verified the same number.
-- Appendix J's review queue reads it. It is never shown to a client, and
-- nothing in it rejects anyone automatically — see J's one rule.
-- ============================================================================

alter table public.phone_verifications
  alter column code_hash drop not null;

alter table public.phone_verifications
  add column if not exists provider_ref text,
  add column if not exists risk jsonb;

comment on column public.phone_verifications.code_hash is
  'HMAC of the code. Null when the provider owns the code (mode: verifies).';
comment on column public.phone_verifications.provider_ref is
  'The vendor''s id for this challenge. Null when we own the code.';
comment on column public.phone_verifications.risk is
  'Carrier and line intelligence from the vendor. Staff-facing only; never auto-rejects.';
