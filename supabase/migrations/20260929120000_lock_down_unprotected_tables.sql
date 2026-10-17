-- ============================================================================
-- Lock down the six tables that shipped without row level security.
--
-- Supabase exposes every table in `public` through its REST API, and the anon
-- key that authorises that API is inlined in every app bundle. Without RLS,
-- anyone who extracts the key can read, edit or delete every row here: every
-- client's private request, every tailor's offer and price.
--
-- None of these tables is read directly by an app. Every access goes through
-- seamflow-api, which connects as the service role / table owner and so
-- bypasses RLS. Enabling it with NO policies therefore means "API only",
-- which is exactly the intended shape.
--
-- The REVOKE is belt-and-braces: even if a permissive policy is added by
-- mistake later, the anon and authenticated roles hold no table privileges.
-- ============================================================================

alter table public.requests           enable row level security;
alter table public.offers             enable row level security;
alter table public.request_recipients enable row level security;
alter table public.request_targets    enable row level security;
alter table public.feed_post_images   enable row level security;
alter table public.tailor_work_images enable row level security;

revoke all on table
  public.requests,
  public.offers,
  public.request_recipients,
  public.request_targets,
  public.feed_post_images,
  public.tailor_work_images
from anon, authenticated;
