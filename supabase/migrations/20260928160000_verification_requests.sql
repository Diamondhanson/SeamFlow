-- ============================================================================
-- Verification requests (appendix J, phase 1 — the spine).
--
-- A tailor asking SeamFlow to confirm a narrow, checkable claim:
--
--   "This is a real business, run by a reachable person, and the work in their
--    feed is their own."
--
-- Not a judgement of skill, and never a gate. J's one rule is that nothing here
-- blocks anybody: a tailor who ignores all of this keeps every feature they
-- have today, Discover included. The badge only ever ADDS.
--
-- WHY `evidence` IS JSONB
--
-- Phase 1 collects one kind of thing (a work photo). Phase 3 adds three more —
-- a social handle with a bio code, a foreground location fix, a registration
-- number — and each has a different shape. A column per kind would mean a
-- migration per kind and a table of mostly-nulls; a discriminated array means
-- the queue renders whatever it finds. See VerificationEvidenceSchema.
--
-- WHAT IS DELIBERATELY NOT HERE
--
-- No ID documents. They prove identity, not craft, and holding a stranger's
-- passport is a liability we have no reason to carry until money moves through
-- SeamFlow (see J.9). The evidence photos we DO hold are deleted 90 days after
-- a decision — the decision and its note are kept forever, the stranger's
-- photos are not.
-- ============================================================================

do $$ begin
  create type public.verification_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailors(id) on delete cascade,
  status public.verification_status not null default 'pending',

  evidence jsonb not null default '[]'::jsonb,

  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  -- Staff, not the tailor. Null while pending, and kept if that staff account
  -- is ever deleted: "who decided this" outliving the decider is the point of
  -- an audit trail.
  decided_by uuid references public.users(id) on delete set null,
  -- Required on a rejection (enforced in the service) and shown to the tailor
  -- word for word, so it has to be a sentence they can act on.
  decision_note text,
  -- Set when the evidence photos have been removed by the retention job, so a
  -- decided request still reads correctly with nothing behind it.
  evidence_purged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one request in flight per tailor. Partial, so the history of past
-- decisions is kept in full — a tailor may be rejected, fix it, and reapply.
create unique index if not exists verification_requests_one_pending
  on public.verification_requests (tailor_id) where status = 'pending';

-- The staff queue: oldest pending first, because whoever has waited longest
-- deserves an answer first.
create index if not exists verification_requests_queue_idx
  on public.verification_requests (status, submitted_at);

create index if not exists verification_requests_tailor_idx
  on public.verification_requests (tailor_id, submitted_at desc);

-- Everything goes through the API (service role). RLS on with no policies means
-- the anon/authenticated keys in the apps can read nothing directly.
alter table public.verification_requests enable row level security;

-- ---------------------------------------------------------------------------
-- The badge itself.
--
-- `is_verified` stays the flag every existing read already uses. These two add
-- the provenance it never had: WHEN it was granted, and on what basis.
--
-- Note what is NOT backfilled: every tailor currently carrying the badge got it
-- from a staff button with no criteria behind it, so their `verified_at` stays
-- null on purpose. Null therefore means "granted before criteria existed", and
-- the dashboard lists exactly those so they can be worked through. Nobody loses
-- a badge silently; we just stop pretending we know why they have one.
-- ---------------------------------------------------------------------------
alter table public.tailors
  add column if not exists verified_at timestamptz,
  add column if not exists verified_note text;

comment on column public.tailors.verified_at is
  'When the badge was granted on evidence. Null = granted before J existed, or not verified.';
comment on column public.tailors.verified_note is
  'What was checked, in staff words. Feeds the badge popover clients can tap.';

-- ---------------------------------------------------------------------------
-- Storage: private evidence, foldered by the uploader's user id so a tailor can
-- only write under their own prefix. Reads are signed URLs issued by the API to
-- staff. Never public: these are photos of someone's workshop and their hands.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-evidence', 'verification-evidence', false)
on conflict (id) do nothing;

drop policy if exists verification_evidence_owner_write on storage.objects;
create policy verification_evidence_owner_write on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'verification-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
