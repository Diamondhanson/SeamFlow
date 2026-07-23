# SeamFlow scaling plan (plain-English)

Status: reference · Last updated: 2026-07-05

A simple checklist of how to keep the system fast and reliable as we add features
and as users grow. Written to be understood by anyone, not just engineers.

## The mental model

Think of the API as a **restaurant**. Waiters take orders and bring food (handle
app requests). The kitchen cooks (does the work). The pantry is the database
(Supabase). Today we have one small, well-organized restaurant — and that's the
right choice for now.

**Two separate questions:**

- **"Can it handle many features?"** → Yes, already. Each feature is its own
  tidy "room" (a NestJS module). Adding a feature = adding a room, not rebuilding
  the house. This is a *modular monolith*; teams run on it for years.
- **"Can it handle many users?"** → Yes, with a handful of upgrades below.

## The golden rule

**Don't over-engineer early.** Keep the single API until a *specific* feature
truly needs its own service. Splitting everything into "microservices" now would
slow us down for no benefit. Do the cheapest upgrade that solves the actual
bottleneck, when it's actually a bottleneck.

## What we already have (good foundations)

- **Modular API** — features are cleanly separated.
- **Managed database + storage + auth** (Supabase) — scales up without us running
  servers; images are already served from storage via signed URLs, not through
  the API.
- **A queue is wired up** (BullMQ + Upstash Redis) — currently mostly dormant, but
  ready to turn on for background work.
- **Error tracking** (Sentry) already in place.
- **Shared contracts** (`@seamflow/schemas`, `@seamflow/api-client`) keep the apps
  and API in sync as we add features.

## The upgrades — and when to do each

### Do these BEFORE scaling out (soon)

- [ ] **Move the scheduled job (reminders cron) to run in ONE place.** Right now
  the hourly cron runs *inside* the API. The moment we run more than one copy of
  the API, it would fire multiple times. Fix with a DB lock (only one instance
  wins) or move it into a dedicated worker. *Low effort, do early.*
- [ ] **Turn on the background worker (the queue).** Slow jobs — invoice PDFs, AI
  image generation, push notifications, feed building — should not make a user
  wait. Run a separate **worker** process that pulls from the queue. The API
  (waiter) stays snappy; the worker (kitchen) does the heavy cooking. **This is
  the single most important scaling move.** *Medium effort, high payoff.*
- [ ] **Confirm the API is stateless** (nothing important kept only in one
  instance's memory) so we can safely run multiple copies. Mostly true already.

### Around your first ~1,000 active users

- [ ] **Run multiple copies of the API behind a load balancer.** Like opening
  identical branches with a host directing customers to a free one. Most hosts
  (Fly/Render/Railway) do this with a slider once the app is stateless.
- [ ] **Add database indexes as tables grow.** Keeps lookups instant instead of
  scanning whole tables. Add them per feature as data accumulates.
- [ ] **Cache the "read-a-lot" things in Redis** — e.g. a tailor's public profile,
  a feed page — so the database isn't hit for every request. We already have
  Upstash.
- [ ] **Put a CDN in front of images.** Photos already come from storage; a CDN
  keeps global copies so they load fast everywhere. Cheap, big win.
- [ ] **Add rate limiting.** Stop one person (or a bad actor) from hammering the
  server. Especially important once the social side opens up.

### Around ~10,000 active users

- [ ] **Bump up the database** (bigger Supabase instance) and **add a read
  replica** — a copy of the database used only for read-heavy pages (the social
  feed, the tailor directory), so reads don't slow down writes.
- [ ] **Add real search** for the feed and "find a tailor near me" (Meilisearch /
  Algolia / pgvector) instead of scanning Postgres. Already named in the roadmap
  (3.6, 3.7).
- [ ] **Use realtime updates** (Supabase Realtime) for live order status and chat,
  instead of the app repeatedly asking "any update?".
- [ ] **Add proper monitoring/metrics** on top of Sentry so we *see* what's slow
  before it breaks (request timings, queue depth, DB load).

### Around ~100,000+ users / heavy AI

- [ ] **Split out only what's forced.** The obvious candidate is the **AI/ML
  workload** — a separate `services/ai` (already reserved in the roadmap) so
  heavy image work scales on its own without affecting the main API.
- [ ] **Regional/edge considerations, autoscaling policies, cost tuning** — handle
  when the numbers justify it, not before.

## If you only remember three things

1. **Turn on the background worker (queue)** — keeps the app fast no matter how
   heavy the work behind the scenes.
2. **Make the scheduler run in exactly one place** — before running multiple API
   copies.
3. **Cache + index the database** — the database is almost always the first thing
   to feel the strain.

Do those three and we go from "a handful of users" to "a lot of users"
comfortably — without rebuilding anything.
