-- ============================================================================
-- Which language a phone is showing, so a push can be worded in it.
--
-- WHY IT LIVES ON THE DEVICE TOKEN
--
-- A designer's language is already stored (notification_preferences, one row per
-- shop), which is how order reminders arrive in the right language. A CUSTOMER
-- has no such row — they have no shop — so a push to them (an order moving to
-- "ready for fitting" or "delivered") could only ever be written in English.
-- The phone knows its language; the token is the thing the phone registers; and
-- one account on two phones may legitimately read two languages. So the column
-- sits here.
--
-- NULL means "this install has not said", which is every install that predates
-- this migration. The server treats NULL as English, exactly as before, and the
-- app fills it in the next time it registers.
--
-- Additive and nullable: nothing existing is rewritten, nothing needs a backfill,
-- and old app builds keep working because they simply never send it.
-- ============================================================================

alter table public.device_tokens
  add column if not exists language text;

alter table public.device_tokens
  drop constraint if exists device_tokens_language_check;

alter table public.device_tokens
  add constraint device_tokens_language_check
  check (language is null or language in ('en', 'fr', 'pt', 'es', 'sw', 'ar'));
