-- ============================================================================
-- Consent for subscription emails.
--
-- Subscriptions are sold on the web, so email is how a tailor on an iPhone or
-- an Android store build ever hears that their trial is ending and what to do
-- about it. Apple permits exactly this — contacting a user about payment
-- options outside the app — provided they consented, so consent is a column
-- rather than an assumption.
--
-- Defaults to true, with a clear notice at sign-up and a switch in Settings:
-- these are account emails about something the tailor is already using, not
-- marketing to strangers.
-- ============================================================================

alter table public.users
  add column if not exists subscription_emails_opt_in boolean not null default true;
