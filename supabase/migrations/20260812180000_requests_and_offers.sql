-- ============================================================================
-- Requests & offers — "Can you make this?" (ROADMAP appendix H)
--
-- The mirror of the discovery feed. A client posts a photo of the garment they
-- want; tailors answer with offers; the client picks one and it becomes a
-- normal conversation and commission.
--
-- Built to the full shape now, deliberately, rather than to today's numbers.
-- The one thing NOT built is the fan-out RANKING that decides which subset of
-- matched tailors to notify — `request_recipients` exists and is populated,
-- but with every eligible tailor rather than a scored top-N. Scoring written
-- against zero traffic would be tuned against nothing and wrong invisibly.
-- Swapping it in later touches one function, not this schema.
-- ============================================================================

create type request_visibility as enum ('selected', 'location');
create type request_location_scope as enum ('town', 'region', 'country');
create type request_status as enum ('open', 'closed', 'fulfilled', 'expired', 'removed');
create type offer_status as enum ('sent', 'shortlisted', 'accepted', 'declined', 'withdrawn');

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id                uuid primary key default gen_random_uuid(),
  client_user_id    uuid not null references public.users (id) on delete cascade,
  title             text,
  description       text not null,
  -- A key from the shared garment taxonomy. Text, not an enum: the vocabulary
  -- grows, and a request written last year must not fail to load when it does.
  garment_type      text not null,
  style_tags        jsonb not null default '[]'::jsonb,
  -- Public-bucket derivatives, copied on post. The client's private upload
  -- never becomes publicly addressable — same rule as the feed.
  photos            jsonb not null default '[]'::jsonb,
  budget_min        numeric(12,2),
  budget_max        numeric(12,2),
  currency          char(3),
  deadline          date,
  visibility        request_visibility not null,
  location_scope    request_location_scope,
  location_value    text,
  status            request_status not null default 'open',
  -- Flips false at the offer cap: protects the client from a flood and stops
  -- tailors spending time on a request that is already saturated.
  accepting_offers  boolean not null default true,
  offers_count      integer not null default 0,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint requests_budget_order check (
    budget_min is null or budget_max is null or budget_max >= budget_min
  ),
  -- The two visibilities have mutually exclusive requirements, and enforcing
  -- that here means no code path can create a location request that points
  -- nowhere.
  constraint requests_location_complete check (
    visibility <> 'location' or (location_scope is not null and location_value is not null)
  )
);

-- The tailor's board: open, unexpired, newest first.
create index if not exists requests_open_idx
  on public.requests (status, expires_at desc)
  where status = 'open';
create index if not exists requests_garment_type_idx on public.requests (garment_type);
create index if not exists requests_location_idx
  on public.requests (location_scope, location_value)
  where visibility = 'location';
create index if not exists requests_client_idx on public.requests (client_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- request_targets — the tailors a `selected` request was addressed to
-- ---------------------------------------------------------------------------
create table if not exists public.request_targets (
  request_id uuid not null references public.requests (id) on delete cascade,
  tailor_id  uuid not null references public.tailors (id) on delete cascade,
  primary key (request_id, tailor_id)
);
create index if not exists request_targets_tailor_idx on public.request_targets (tailor_id);

-- ---------------------------------------------------------------------------
-- request_recipients — who was NOTIFIED about a `location` request
--
-- Distinct from eligibility on purpose. Any eligible tailor may BROWSE an open
-- request; this records the smaller set that was actively told about it, which
-- is what a digest is built from and what makes "why did I see this?"
-- answerable later.
-- ---------------------------------------------------------------------------
create table if not exists public.request_recipients (
  request_id  uuid not null references public.requests (id) on delete cascade,
  tailor_id   uuid not null references public.tailors (id) on delete cascade,
  -- Why this tailor was chosen. Currently 'location' or 'speciality'; becomes
  -- genuinely interesting when ranking lands.
  reason      text not null,
  notified_at timestamptz,
  primary key (request_id, tailor_id)
);
create index if not exists request_recipients_tailor_idx
  on public.request_recipients (tailor_id, notified_at);

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.requests (id) on delete cascade,
  tailor_id       uuid not null references public.tailors (id) on delete cascade,
  -- Both null means "open to discuss", which is a first-class answer: forcing
  -- a price turns this into a lowest-bid auction and drives skilled tailors off.
  price           numeric(12,2),
  price_max       numeric(12,2),
  currency        char(3),
  message         text not null,
  sample_post_id  uuid references public.feed_posts (id) on delete set null,
  status          offer_status not null default 'sent',
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One offer per tailor per request. Without this a tailor can bury a client
  -- under repeated bids, which is the most obvious way to spam this board.
  constraint offers_one_per_tailor unique (request_id, tailor_id),
  constraint offers_price_order check (
    price is null or price_max is null or price_max >= price
  ),
  -- A range needs a bottom. price_max alone is meaningless.
  constraint offers_range_needs_floor check (price_max is null or price is not null)
);

create index if not exists offers_request_idx on public.offers (request_id, created_at desc);
create index if not exists offers_tailor_idx on public.offers (tailor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Conversations learn where they came from
-- ---------------------------------------------------------------------------
alter type conversation_origin add value if not exists 'request';

alter table public.conversations
  add column if not exists request_id uuid references public.requests (id) on delete set null,
  add column if not exists offer_id   uuid references public.offers (id) on delete set null;

create index if not exists conversations_request_idx
  on public.conversations (request_id)
  where request_id is not null;

comment on table public.requests is
  'Client briefs — "can you make this?". The reverse of the discovery feed.';
comment on column public.requests.accepting_offers is
  'False once the offer cap is hit; the board stops inviting more work on it.';
comment on table public.request_recipients is
  'Who was notified. Browsing eligibility is broader — see the requests service.';
