-- ============================================================================
-- Finish the job 20260929120000 started.
--
-- That migration enabled RLS and REVOKED anon/authenticated privileges on six
-- tables. Twelve more were given RLS but kept their grants, which leaves them
-- resting on a single fact: that they have no policies. RLS with no policies
-- denies everything, so they are closed today — but the REVOKE is what makes
-- them stay closed. Quoting the earlier migration:
--
--     "even if a permissive policy is added by mistake later, the anon and
--      authenticated roles hold no table privileges."
--
-- That reasoning applies with more force here, not less: this list includes
-- who is an administrator (`staff`), the audit trail of what they did
-- (`admin_actions`), the subscription prices (`platform_settings`), and money
-- (`subscriptions`, `subscription_payments`).
--
-- Safe for every one of them because no app reads any of these directly. The
-- only table an app addresses through the REST API is `designs`, and the only
-- tables in the realtime publication are `messages` and `conversations` —
-- none of which appear below.
--
-- Idempotent: both statements can be re-run without error.
-- ============================================================================

alter table public.admin_actions         enable row level security;
alter table public.content_reports       enable row level security;
alter table public.phone_verifications   enable row level security;
alter table public.platform_settings     enable row level security;
alter table public.saved_designs         enable row level security;
alter table public.staff                 enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.support_messages      enable row level security;
alter table public.support_tickets       enable row level security;
alter table public.user_blocks           enable row level security;
alter table public.verification_requests enable row level security;

revoke all on table
  public.admin_actions,
  public.content_reports,
  public.phone_verifications,
  public.platform_settings,
  public.saved_designs,
  public.staff,
  public.subscription_payments,
  public.subscriptions,
  public.support_messages,
  public.support_tickets,
  public.user_blocks,
  public.verification_requests
from anon, authenticated;
