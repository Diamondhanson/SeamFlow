# SeamFlow — Phased Product Roadmap

**Owner:** Diamond
**Last updated:** May 14, 2026
**Repo:** `SeamFlow/` monorepo

---

## How to use this document

This is the working reference for what gets built in SeamFlow, in what order, and with what technology. It is intentionally specific so that any developer (including future-you on a different machine) can pick it up, scroll to the right phase, and start implementing without re-deciding the stack.

Every feature is laid out the same way:

- **What it is** — the user-facing capability in one or two sentences
- **Why it matters** — the business/user reason it's in this phase and not earlier or later
- **Tech & services** — exact tools, packages, and providers
- **Implementation approach** — how it's actually built, where it lives in the monorepo, what to watch out for
- **Dependencies** — what must exist before this feature can be built

Phases are sequential. Don't start Phase 2 work before Phase 1 is shipping to real users, and don't start Phase 3 before Phase 2 is paying for itself. The biggest risk to a product like this is scope drift — building Phase 3 features when Phase 1 still doesn't persist data.

Effort estimates are rough and assume a small team (1–3 engineers). Calendar months in headers are guideposts, not commitments.

---

## Canonical stack reference

Every technology mentioned anywhere in this document, in one place.

**Languages**
- TypeScript — every Node app and package
- Python (3.12) — `services/ai` only, when/if it gets added

**Mobile**
- Expo SDK 52+ (React Native 0.76+)
- Expo Router (file-based routing)
- EAS Build & EAS Update (managed builds and OTA updates)

**Web**
- Next.js 14+ (App Router)
- Tailwind CSS
- shadcn/ui (component primitives)

**Backend**
- NestJS (REST + WebSocket)
- Prisma or Drizzle ORM (pick one early; recommend Drizzle for TypeScript-first ergonomics)
- BullMQ (background jobs)
- Zod (validation, shared via `@seamflow/schemas`)

**Data**
- Supabase (Postgres, Auth, Storage, Realtime, Row-Level Security)
- pgvector extension (for similarity search, Phase 3+)
- PostGIS extension (for geo discovery, Phase 3+)
- Upstash Redis (queues, caching, rate limits)
- WatermelonDB (on-device SQLite for offline sync in mobile apps)

**Messaging**
- Expo Push (mobile push notifications, free)
- WhatsApp Business Cloud API (primary client comms channel)
- Twilio (SMS, global) / Termii (SMS, Africa-optimized)
- Resend or Postmark (transactional email)

**Payments**
- Stripe — global cards & subscriptions
- Paystack — Nigeria, Ghana, South Africa, Kenya
- Flutterwave — broader Africa, mobile money (M-Pesa, MTN MoMo)
- Razorpay — India (Phase 3)

**AI**
- Anthropic Claude API — text generation, summarization, vision
- OpenAI GPT-4o — fallback / comparison provider
- pgvector — similarity / semantic search

**Media & files**
- Cloudflare R2 — object storage (zero egress fees)
- Cloudflare Images — image resizing, format conversion, CDN
- Expo Image Picker / Expo Camera — capture

**Observability & analytics**
- Sentry — errors (mobile + backend)
- PostHog — product analytics, feature flags, session replay (open source, self-hostable)
- Axiom or Logtail — log aggregation

**DevOps**
- pnpm + Turborepo — monorepo
- GitHub Actions — CI/CD
- Fly.io (or Railway) — API hosting
- Vercel — Next.js apps
- EAS — mobile builds
- Terraform or Pulumi — IaC (Phase 3+)

**Other**
- i18next — internationalization
- react-native-qrcode-svg — QR generation (measurement locker)
- expo-calendar — calendar integration
- PDFKit (Node) — invoice PDFs
- Algolia or Meilisearch — search (tailor directory, Phase 3+)

---

## Phase 0 — Foundation (week 1–2)

The plumbing that has to exist before any user-facing work makes sense. Skipping this phase looks like time saved and never is.

### 0.1 Monorepo scaffolding

- **What:** pnpm + Turborepo monorepo with `apps/` and `packages/` already laid out.
- **Why:** Avoid the eventual painful migration from a single-app repo to a multi-app one.
- **Tech:** pnpm, Turborepo, TypeScript project references.
- **Approach:** Already done. See repo root.
- **Dependencies:** none.

### 0.2 Shared types and schemas packages

- **What:** Populate `@seamflow/types` with the canonical interfaces (`Client`, `Order`, `Measurements`, `OrderStatus`, `User`, `Tailor`). Populate `@seamflow/schemas` with matching Zod schemas. Wire `@seamflow/utils` with conversion helpers (cm⇄inches, phone normalization, currency formatting).
- **Why:** A single source of truth for the data model. Every app imports from here so a field rename never breaks two apps silently.
- **Tech:** TypeScript, Zod.
- **Approach:** Define types first, derive Zod schemas with `z.infer<>` where possible. Export both. Frontend uses Zod schemas in forms; backend uses them on every API boundary.
- **Dependencies:** monorepo scaffolding.

### 0.3 Supabase project + database schema

- **What:** Spin up a Supabase project. Create the initial Postgres schema: `users`, `tailors`, `clients`, `measurements`, `orders`, `order_items`, `fabrics`, `payments`. Enable Row-Level Security and write the first policies.
- **Why:** Persistence is the single biggest unlock for the mobile app. Until this exists, nothing in the app survives a restart.
- **Tech:** Supabase, Postgres, SQL migrations.
- **Approach:** Manage schema via migrations in `apps/seamflow-api/migrations/`. Keep RLS policies in version control. Treat the schema as a public API contract.
- **Dependencies:** types/schemas package decided.

### 0.4 NestJS API skeleton

- **What:** Boot `apps/seamflow-api` with NestJS, a `/health` route, Supabase client wired up, BullMQ + Redis configured, Sentry installed, Zod-based request validation.
- **Why:** Even before there are real endpoints, the API needs to deploy somewhere so the rest of the team can target it.
- **Tech:** NestJS, Drizzle ORM, Supabase JS client, BullMQ, Upstash Redis, Sentry, Zod.
- **Approach:** Use NestJS's modular structure. Each domain (clients, orders, payments, ai) becomes its own module. Drizzle schema lives alongside the API code and is the source of truth for the database shape.
- **Dependencies:** Supabase project.

### 0.5 CI/CD scaffolding

- **What:** GitHub Actions workflows for lint, test, and deploy. Vercel preview deploys for `seamflow-web` and `seamflow-admin`. EAS Update channel for `seamflow-app`. Fly.io deploy on push to main for `seamflow-api`.
- **Why:** Catches "works on my machine" early. Gives the team confidence to ship daily.
- **Tech:** GitHub Actions, Vercel, EAS, Fly.io.
- **Approach:** Single `ci.yml` runs `turbo run lint test build` filtered to changed packages. Deploy workflows are per-app.
- **Dependencies:** all apps have minimal package.json (done).

### 0.6 Auth foundation

- **What:** Supabase Auth with phone OTP enabled. A single `users` table with role enum (`tailor`, `tailor_staff`, `client`, `admin`). API middleware that verifies the JWT and attaches the user to every request.
- **Why:** Every feature past this point assumes users exist.
- **Tech:** Supabase Auth, NestJS guards.
- **Approach:** Phone OTP is the default because it works globally and matches how tailors think about their clients (by phone number). Email is a secondary option. Roles are enforced both in the API (route guards) and the database (RLS policies).
- **Dependencies:** Supabase project, API skeleton.

---

## Phase 1 — Launchable MVP (months 1–3)

What you need to put SeamFlow in the hands of 50 tailors in one city and have them actually use it daily. Every feature here directly replaces a paper-notebook task.

### 1.1 Persistent clients & measurements

- **What:** Tailor can create clients, edit them, search them, and store their measurements. Data persists across app restarts and syncs to the cloud.
- **Why:** The single most common action in the app. Without this nothing else matters.
- **Tech:** Supabase Postgres, WatermelonDB (on-device), `@seamflow/api-client`, `@seamflow/schemas`.
- **Approach:** Mobile app reads/writes to local WatermelonDB. A sync engine reconciles with Supabase on a schedule and when the network reappears. Measurements use a flexible JSONB column so we can later add per-garment templates without a schema migration.
- **Dependencies:** Phase 0 complete.

### 1.2 Orders with status workflow

- **What:** Tailor creates an order against a client. Orders carry `orderName`, `dateOrdered`, `dateDelivery`, `notes`, `status` (registered → in_progress → testing → on_pause → delivered).
- **Why:** This is the core unit of work for a tailor. Status changes are what clients want updates on.
- **Tech:** Same stack as 1.1 plus a status state machine encoded in `@seamflow/utils`.
- **Approach:** Status transitions are validated server-side so invalid jumps ("delivered" → "in_progress") are rejected. Every status change is recorded in an `order_events` table for the future timeline view.
- **Dependencies:** 1.1.

### 1.3 Photos on orders

- **What:** Attach reference images, fabric swatches, and final-result photos to an order. Pull from camera or gallery.
- **Why:** Tailoring is visual. The biggest gap in the v0 app.
- **Tech:** Expo Image Picker, Expo Camera, Cloudflare R2 for storage, Cloudflare Images for resizing/CDN.
- **Approach:** Upload originals to R2 via pre-signed URLs issued by the API. Display thumbnails through Cloudflare Images variants. Store image keys (not URLs) in Postgres so the storage provider can change later. Compress on-device before upload to save data on slow networks.
- **Dependencies:** 1.2.

### 1.4 Offline-first sync

- **What:** App works fully offline. Created orders, photos, edits queue up and sync the moment data is available.
- **Why:** Target markets have patchy data. A tailor in a market stall can't lose an order because the WiFi dropped.
- **Tech:** WatermelonDB (SQLite under the hood), custom sync adapter against the API, NetInfo for network detection.
- **Approach:** Write all reads/writes against WatermelonDB. The sync adapter pushes local changes and pulls remote changes in a transaction. Conflict resolution is last-write-wins for simple fields; orders use server-side merge for status changes.
- **Dependencies:** 1.1, 1.2.

### 1.5 Magic-link order view (seamflow-web)

- **What:** When a tailor saves an order, they can copy a share link. Client taps it, lands on a mobile-friendly web page showing order details, current status, fitting date, and balance due. No install required.
- **Why:** This is what turns SeamFlow from a CRM into a two-sided product without forcing clients to install an app.
- **Tech:** Next.js (App Router), Tailwind, shadcn/ui, Supabase JS client, signed short-lived tokens for non-authed link access.
- **Approach:** Route `seamflow.app/o/[token]`. The token is a JWT containing the order ID and an expiration (default 30 days). Server-side rendering for fast first paint on slow connections. Optional phone-OTP login to upgrade the visit into a tracked client account.
- **Dependencies:** 1.2, API auth.

### 1.6 WhatsApp share links

- **What:** "Share with client" button in the mobile app opens WhatsApp with a pre-filled message containing the magic link.
- **Why:** Tailors live in WhatsApp. Meeting them where they already communicate is non-negotiable.
- **Tech:** Linking API in Expo (`wa.me/<phone>?text=...`). No WhatsApp Business API needed at this stage.
- **Approach:** Build a `useShareOrder()` hook that formats the message in the tailor's language and opens WhatsApp. Falls back to native share sheet if WhatsApp isn't installed.
- **Dependencies:** 1.5.

### 1.7 Deposit collection

- **What:** From the magic-link page, a client can pay a deposit. The tailor sees the payment marked in the app within seconds.
- **Why:** Tailors get stiffed on balances constantly. Even basic deposit collection is a paid-tier-justifying feature on its own.
- **Tech:** Stripe (global cards) + Paystack (Nigeria/Ghana/SA/Kenya). Payment provider abstraction layer in the API.
- **Approach:** API exposes `/payments/initiate` that returns a provider-specific payload (Stripe Checkout Session URL, Paystack init response). Webhook endpoints (`/webhooks/stripe`, `/webhooks/paystack`) mark the payment confirmed and emit a realtime event so the tailor's app updates instantly. Idempotency keys to prevent double-charges.
- **Dependencies:** 1.5.

### 1.8 Push notifications

- **What:** Tailor gets a push when a payment lands or a fitting is upcoming. Client gets a push (if they have the app installed later) when their order status changes.
- **Why:** Engagement and trust.
- **Tech:** Expo Push (free, no FCM/APNs setup needed for managed Expo).
- **Approach:** Backend stores Expo push tokens per device. A `NotificationsService` in the API enqueues jobs to BullMQ; a worker calls the Expo push endpoint. Notification templates in `@seamflow/utils` so they can be translated.
- **Dependencies:** 1.7 (payments) gives the first compelling use case.

### 1.9 Authentication and tailor account setup

- **What:** Tailor signs in via phone OTP, sets up their business profile (name, photo, location, currency), and invites optional staff.
- **Why:** Foundation for multi-staff (Phase 2) and the directory (Phase 3).
- **Tech:** Supabase Auth, NestJS auth module.
- **Approach:** Phone-first auth. Country code defaults to the device locale. Staff invites are token links sent via WhatsApp/SMS.
- **Dependencies:** Phase 0.6.

### 1.10 Basic search & filtering

- **What:** Search clients by name or phone. Filter orders by status, delivery date, paid/unpaid.
- **Why:** Becomes essential the moment a tailor has 50+ clients.
- **Tech:** Postgres trigram indexes (`pg_trgm`) for fuzzy search; local WatermelonDB indexes for offline search.
- **Approach:** Both online and offline search hit the local DB first; cloud search is a fallback if local data is missing. Trigram index on `clients.full_name` and `clients.phone`.
- **Dependencies:** 1.1.

**Phase 1 exit criteria:** 50 paying tailors, daily active use, < 1% sync error rate, average response time under 300 ms on 3G, monthly recurring revenue covering hosting costs.

---

## Phase 2 — Sticky features (months 4–6)

Features that turn a useful tool into a tool tailors won't stop paying for. Most of these are pulled from real complaints during Phase 1.

### 2.1 Multi-staff accounts

- **What:** Tailor invites staff with limited permissions (e.g., "can edit orders but not delete clients"). Audit log of who did what.
- **Why:** Almost every tailor has at least one apprentice or assistant.
- **Tech:** Postgres roles table, RLS policies keyed off `tailor_id` + `staff_role`.
- **Approach:** Roles: `owner`, `manager`, `tailor`, `viewer`. Every action writes to an `audit_log` table. Mobile app caches the user's role and pre-disables disallowed UI; API enforces server-side regardless.
- **Dependencies:** 1.9.

### 2.2 Invoicing & PDFs

- **What:** Generate a branded invoice PDF for an order. Share via WhatsApp. Mark paid in full when balance clears.
- **Why:** Larger tailoring businesses ask for this within their first week.
- **Tech:** PDFKit or Puppeteer on the API. Cloudflare R2 for storage. Server-side rendering keeps fonts and layout consistent.
- **Approach:** Invoice template in `@seamflow/utils/invoices/`. Job-queued generation (PDFKit on a worker) to keep API latency low. Each invoice gets a public signed URL that expires in 7 days.
- **Dependencies:** 1.7.

### 2.3 Fabric library

- **What:** Tailor photographs fabrics they have in stock, records supplier, yardage, and cost. Attach fabrics to orders.
- **Why:** Closes the loop between cost of goods and order pricing.
- **Tech:** Same image stack as 1.3. New tables `fabrics`, `order_fabrics` (junction).
- **Approach:** Fabric photos use the Cloudflare Images variants for thumbnails. Search by color, supplier, or composition. Later this becomes the basis for the "what have I made with this fabric before" view.
- **Dependencies:** 1.3.

### 2.4 AI: order-notes summarization

- **What:** Tailor scribbles messy notes; a "Tidy up" button produces a clean, structured summary the client can read.
- **Why:** Lowers friction at the counter. Tailors hate writing detailed notes.
- **Tech:** Claude API (Haiku for speed, Sonnet for quality). Wrapped in `@seamflow/api-client`'s `ai.summarize()`.
- **Approach:** Free tier gets 10 summaries/month, paid is unlimited. Cache results by note hash to avoid re-billing. Always show the user the original alongside the AI version with an "Accept / Edit / Discard" flow.
- **Dependencies:** API skeleton; some tailor-facing data.

### 2.5 Calendar with fitting reminders

- **What:** A calendar view of upcoming deliveries, fittings, and pickups. Local-device reminders + automated WhatsApp messages to clients.
- **Why:** "When is my dress ready?" is the #1 customer question.
- **Tech:** `expo-calendar` for device integration, BullMQ scheduled jobs, WhatsApp Business Cloud API for outgoing messages.
- **Approach:** Each order has a `dateDelivery` and optional `fittingDates[]`. A nightly job queues up reminders for the next day. Tailor can opt out per-client.
- **Dependencies:** 2.6 (WhatsApp Business) ideally already in place, but ICS export works without it.

### 2.6 WhatsApp Business Cloud API

- **What:** Outgoing automated messages from a verified business number (not the tailor's personal WhatsApp).
- **Why:** Higher delivery, supports templates, doesn't require the tailor to keep WhatsApp Web open.
- **Tech:** Meta WhatsApp Business Cloud API directly. No third-party BSP needed (yet).
- **Approach:** One shared "SeamFlow Reminders" number sends approved templates ("Hi {name}, your {garment} is ready for fitting on {date}"). Replies route into a unified inbox per tailor. Phase later: white-label numbers per tailor as a paid feature.
- **Dependencies:** Meta Business Manager verification (allow 1–2 weeks).

### 2.7 Custom measurement templates per garment type

- **What:** When creating an order, the tailor picks a garment type (suit, dress, kaftan, kurta, blouse). The measurement form adapts: a kaftan needs different fields than a three-piece suit.
- **Why:** The current flat measurement model breaks down the moment you serve more than one style.
- **Tech:** JSONB `measurements` column already in place; add `measurement_templates` table with schemas owned by the tailor.
- **Approach:** Ship 10 starter templates (suit, shirt, trouser, dress, blouse, kaftan, agbada, sherwani, lehenga, abaya). Tailors can clone and customize. Templates are JSON Schema-shaped so we can validate on save.
- **Dependencies:** 1.1.

### 2.8 Multi-language i18n

- **What:** App and web run in English, French, Yoruba, Hausa, Hindi, Urdu, Tagalog, Arabic at minimum.
- **Why:** Most target users aren't English-native.
- **Tech:** `i18next` + `react-i18next` (mobile), `next-intl` (web), Lokalise or a self-hosted JSON workflow for translation.
- **Approach:** Every string key lives in `packages/utils/i18n/`. RTL support for Arabic/Urdu. Currency, date, and number formatting via `Intl`.
- **Dependencies:** none — easier earlier than later.

### 2.9 SMS fallback

- **What:** If a client doesn't have WhatsApp or it fails delivery, send the same message via SMS.
- **Why:** Reliability. Some markets are still SMS-first.
- **Tech:** Twilio (global), Termii (Africa, cheaper rates).
- **Approach:** Abstract behind a `MessagingService.send(channel, recipient, payload)`. The service tries WhatsApp first, falls back to SMS on failure.
- **Dependencies:** 2.6.

### 2.10 Subscription billing for tailors

- **What:** Free tier (limited clients/orders) and Pro tier ($5–10/mo emerging markets, $20–30/mo developed) with cloud sync, unlimited everything, advanced features.
- **Why:** Revenue. Without it, hosting kills the product at scale.
- **Tech:** Stripe Billing globally, Paystack subscriptions for Africa.
- **Approach:** Feature flags in `@seamflow/utils` gate paid features; the gate checks the tailor's current plan from the API. Subscription state syncs via webhooks.
- **Dependencies:** 1.7.

**Phase 2 exit criteria:** Free → paid conversion rate above 5%, monthly churn under 3%, NPS above 40 among paying users.

---

## Phase 3 — Differentiation & growth (months 7–12)

Features that build a real moat. By now you have product-market fit; this phase makes SeamFlow harder to leave and easier to discover.

### 3.1 seamflow-client native mobile app

- **What:** A dedicated mobile app for the consumer side. They get push notifications, can browse their lookbook offline, save moodboards, share measurements via QR.
- **Why:** Web is friction-free for one-off views; an app is for repeat users. By Phase 3 you've identified the clients who place 3+ orders.
- **Tech:** Expo / React Native, shared `@seamflow/*` packages, Supabase client SDK, EAS for builds.
- **Approach:** Reuse 60–80% of mobile patterns from `seamflow-app`. Different navigation (clients don't need a CRM). See **Appendix A** for the full feature list.
- **Dependencies:** Phase 2 complete; existing magic-link conversion data to inform which features matter most.

### 3.2 Measurement locker with QR sharing

- **What:** A client's measurements live in their account, portable across tailors. At a new tailor, they show a QR code; the tailor scans it; measurements appear in the tailor's app.
- **Why:** This is the consumer-side viral loop. "My measurements are saved in SeamFlow" becomes a thing people say.
- **Tech:** `react-native-qrcode-svg` (display), `expo-camera` (scan), short-lived signed tokens server-side.
- **Approach:** QR encodes a one-time token valid for 10 minutes and only redeemable by an authed tailor account. Client confirms the transfer with a push notification.
- **Dependencies:** 3.1.

### 3.3 Moodboards + AI photo-to-notes

- **What:** Client saves Instagram/Pinterest screenshots into an order. Claude (vision) reads the images and writes structured notes: "Sweetheart neckline, cap sleeves, A-line skirt to mid-calf, exposed back zipper."
- **Why:** The clearest "wow" feature for fashion-conscious users. Magical demo, lowers ambiguity on what the client actually wants.
- **Tech:** Claude API with vision, Pinterest API for legitimate board imports, image upload via R2.
- **Approach:** `services/ai` (Python FastAPI) handles vision pipeline if cost or latency needs custom batching; otherwise call Claude directly from the Node API. Always show the tailor the generated text alongside the source images and let them edit.
- **Dependencies:** 1.3, 2.4.

### 3.4 Try-on history / personal lookbook

- **What:** Every completed order can have a "wearing it" photo. Over time, both tailor and client build a visual archive of every piece they've made together.
- **Why:** Emotional stickiness. Fashion enthusiasts adore this. Drives referrals via shared lookbook links.
- **Tech:** Same image stack as 1.3. New `garment_photos` table; optional public share link per garment.
- **Approach:** Post-delivery push prompts the client to upload a photo. Lookbook view in `seamflow-client` is grid-style, filterable by year, garment type, or fabric.
- **Dependencies:** 3.1.

### 3.5 Design recipes library

- **What:** Tailors save a successful design as a "recipe" (measurements, notes, fabric type, photos). Reuse it for the next client who asks for something similar.
- **Why:** Saves the tailor's most valuable asset — their style memory — and makes them faster.
- **Tech:** New `design_recipes` table. `@seamflow/utils` for the merge logic (copy notes, swap measurements with the new client's).
- **Approach:** "Create order from recipe" flow in the tailor app. Recipes are private by default; later (Phase 4) a tailor can opt to publish recipes for the directory.
- **Dependencies:** 2.7 (templates).

### 3.6 Tailor directory & discovery

- **What:** Consumer-facing map and search of tailors near you, filterable by specialty, price tier, languages spoken, and rating.
- **Why:** Network effects. Tailors invite their existing clients; the platform brings them new clients.
- **Tech:** PostGIS extension on Supabase for geospatial queries. Algolia or Meilisearch for fuzzy text search. Next.js public pages for SEO.
- **Approach:** Tailor opt-in (privacy default off). Reviews tied to completed orders only — no review-bombing from non-customers. Profile pages public on `seamflow.app/tailor/<slug>` for SEO.
- **Dependencies:** 3.1; enough tailors to make a directory worth opening.

### 3.7 AI similarity search (pgvector)

- **What:** "Show me past garments similar to this reference photo" for both tailors (find a recipe) and clients (find inspiration in their own lookbook).
- **Why:** Surfacing existing content beats creating new content.
- **Tech:** pgvector in Supabase; embeddings via Claude or OpenAI; or a smaller hosted model like Voyage AI.
- **Approach:** Compute embeddings on photo upload; store in a `garment_embeddings` table. Cosine-similarity queries return top-N matches. Cache aggressively.
- **Dependencies:** 3.3.

### 3.8 Razorpay (India market)

- **What:** Indian-specific payment provider with UPI support.
- **Why:** India is the biggest tailoring market in the world.
- **Tech:** Razorpay JS SDK, abstracted behind the existing `PaymentProvider` interface.
- **Approach:** Same pattern as Stripe/Paystack — add a Razorpay adapter, route by tailor country.
- **Dependencies:** 1.7's payment abstraction.

### 3.9 Internal admin dashboard (seamflow-admin)

- **What:** Support and ops dashboard: search any tailor, refund a payment, fix data, see funnel metrics, moderate reported content.
- **Why:** Without it the team is doing support via direct database queries.
- **Tech:** Next.js, shadcn/ui, shared `@seamflow/api-client`, role-gated admin endpoints.
- **Approach:** Lives in `apps/seamflow-admin`. Every admin action is logged. Two-factor auth required.
- **Dependencies:** sufficient user volume to justify the build.

### 3.10 Product analytics (PostHog)

- **What:** Funnel analysis, feature flags, A/B testing, session replay.
- **Why:** Decision-making by data instead of intuition.
- **Tech:** PostHog (cloud or self-hosted).
- **Approach:** Centralized event taxonomy in `@seamflow/utils/analytics`. Every screen view and key action emits an event. Feature flags wrap any new feature for staged rollout.
- **Dependencies:** none — earlier is better.

**Phase 3 exit criteria:** Multiple cities live, two-sided activity (clients independently inviting other tailors), organic search traffic to directory pages, ARR in low six figures.

---

## Phase 4 — Scale & platform (year 2+)

Long-horizon work. Don't plan these in detail today; this section is here so the architecture in Phases 0–3 doesn't paint itself into a corner.

### 4.1 In-app chat between tailor and client

- **Tech:** Stream Chat or Sendbird, or a custom build on Supabase Realtime + Postgres.
- **Why:** Centralizes communication that currently spreads across WhatsApp, SMS, and phone calls.

### 4.2 Video fittings

- **Tech:** Mux for streaming, Cloudflare Stream as an alternative, WebRTC for live calls.
- **Why:** Diaspora customers ordering from abroad.

### 4.3 AI style recommendations

- **Tech:** Custom recommendation model on top of the embeddings infrastructure from 3.7.
- **Why:** "You might also like" surface for both clients and tailors.

### 4.4 Marketplace features

- **What:** Fabric sellers, embellishment vendors, and pattern-makers list products on the platform.
- **Why:** Revenue diversification and lock-in.

### 4.5 White-label / B2B

- **What:** Fashion schools, large bridal vendors, or chains buy private-label SeamFlow instances.
- **Why:** Enterprise revenue.

### 4.6 Native desktop app (Tauri)

- **Tech:** Tauri + the existing web codebase.
- **Why:** Larger tailoring businesses prefer desktop for bulk data entry.

### 4.7 Hardware integrations

- **What:** Bluetooth-connected measuring tape or body scanner integrations.
- **Why:** Speed and accuracy. Highly speculative; revisit only with proven partner hardware.

---

## Appendix A — seamflow-client (consumer mobile app)

This is the full feature list for the client-facing mobile app, which gets built in **Phase 3**. Reserved here so the data model in Phase 0/1 doesn't have to change later to accommodate it.

### Core consumer features

**A.1 Phone-OTP onboarding** — Same auth pattern as the tailor app. Optional email later. Pull existing data from any magic-link orders the user has interacted with.

**A.2 Personal measurement locker** — A user's measurements (or multiple sets — "everyday," "wedding-ready"), with a history of edits. Display in cm or inches based on preference.

**A.3 QR / link sharing of measurements** — Show a one-time QR at a new tailor. Receive a push to confirm the share. Revoke any active share at any time.

**A.4 Orders across all tailors** — Unified inbox of every order the user has open, across however many tailors. Status, fitting dates, payment due, magic-link view.

**A.5 Lookbook** — Photo grid of every garment ever made for the user. Filter by year, garment type, fabric, tailor. Optional public share.

**A.6 Moodboards** — Save Instagram/Pinterest links, photos from the camera roll, AI-generated descriptions. Attach to an order so the tailor sees inspiration alongside measurements.

**A.7 Tailor discovery** — Search nearby tailors, see specialties, ratings, sample work. Tap to start a new order or message.

**A.8 Payments** — Pay deposit or balance directly in-app. View receipts. Download invoices.

**A.9 Reminders & calendar** — Fitting dates and pickup dates flow into the device calendar. Push reminders the day before.

**A.10 Style profile** — Preferences over time: favorite necklines, lengths, color palettes. Powers recommendations in A.13.

### Stretch features (mid-Phase 3 → Phase 4)

**A.11 In-app chat** — Per-order conversation with the tailor. Replaces WhatsApp threading.

**A.12 Garment timeline** — For each order, see status updates, photos from the tailor as work progresses, fittings scheduled.

**A.13 Recommendations feed** — Personalized: "Tailors in your city you might like," "Styles popular this season near you."

**A.14 Wardrobe planning** — Tag past garments with where you've worn them. Notes on what worked.

**A.15 Group orders** — Coordinate matching outfits for a wedding party, family event, or uniform.

**A.16 Referral mechanics** — Refer a friend → both get credit toward your next deposit.

**A.17 Multi-tailor measurement deltas** — Heads-up: "You haven't been measured in 14 months. Update before your next order?" with optional in-app body scan via the camera.

### Technical stack for seamflow-client

Same baseline as `seamflow-app`:

- Expo SDK + React Native, TypeScript, Expo Router
- WatermelonDB for offline-first
- Shared `@seamflow/types`, `@seamflow/schemas`, `@seamflow/api-client`, `@seamflow/utils`
- Supabase JS client for realtime subscriptions on order status
- Expo Push for notifications
- EAS for builds and OTA updates
- Different navigation graph and theming — consumer aesthetic, not business utility

What it does NOT share with `seamflow-app`:

- Different home/landing flows
- Different navigation hierarchy (orders-first, not clients-first)
- Lighter offline footprint (consumers don't need all measurement data offline — usually just their own)

---

## Appendix B — Key architectural decisions

A short list of decisions worth committing to early so they don't get re-litigated every sprint.

**B.1 TypeScript everywhere on Node side, Python only when justified.** Default to TS. Add `services/ai` only when there's a real ML workload that can't be a Claude API call.

**B.2 Postgres as the single source of truth.** No second database for caching that diverges. Redis is for queues and ephemeral state only.

**B.3 Row-Level Security as the auth backbone.** Every multi-tenant row is RLS-protected at the database level. API guards are belt-and-suspenders, not the only line of defense.

**B.4 Payment providers behind a single interface.** Always. Adding a new country = new adapter, not new endpoints.

**B.5 Messaging providers behind a single interface.** WhatsApp / SMS / Email all routed through one service. Per-message channel preference.

**B.6 Offline-first on every mobile app from day one.** Retro-fitting offline support is brutal; build it in early.

**B.7 Image keys, not URLs, in the database.** Lets us swap storage providers (R2 → S3 → something else) without a data migration.

**B.8 Roles, not user types.** A user can be a tailor AND a client. Don't bake role into the user table; model it as a relationship.

**B.9 Feature flags from day one.** Every Phase 2+ feature ships behind a flag. Staged rollout is the default.

**B.10 Event log on important entities.** Orders, payments, and measurements have append-only event tables. Easier debugging, easier audit, easier future features (timelines, undo).

---

## Appendix C — Risks & open questions

**C.1 WhatsApp dependency.** Meta could change terms or pricing. Mitigate by always having SMS fallback and never making the experience dependent on a single channel.

**C.2 Payment processor risk in emerging markets.** Paystack or Flutterwave could freeze a merchant account during a dispute. Have a second provider warm.

**C.3 Pricing the free tier wrong.** Too generous and revenue dies; too tight and growth stalls. Plan to revisit pricing every 90 days in Phase 2.

**C.4 Translation quality.** Machine translation embarrasses local users. Budget for native-speaker review of every shipped language.

**C.5 Image storage cost growth.** Plan a media lifecycle policy (move 2-year-old images to cold storage) before R2 bills surprise you.

**C.6 AI cost spike.** Vision API costs can balloon. Cache aggressively; rate-limit the free tier; consider self-hosted alternatives if usage > $X/month.

**C.7 Data export and portability.** Tailors should be able to export their clients to CSV at any time. Lock-in is a short-term win and long-term loss.

**C.8 Regulatory.** Phone OTP and payments touch local financial and privacy regulations in every country. Get legal review per market before launching.

---

## Quick implementation order cheat-sheet

If you only read one section, read this one. The literal next 12 things to build, in order, once Phase 0 is done:

1. Persistent clients + measurements (1.1)
2. Persistent orders + statuses (1.2)
3. Photos on orders (1.3)
4. Offline sync (1.4)
5. Magic-link order view (1.5)
6. WhatsApp share button (1.6)
7. Deposit collection via Stripe + Paystack (1.7)
8. Push notifications (1.8)
9. Tailor account setup + onboarding (1.9)
10. Search & filter (1.10)
11. Ship to 50 tailors in one city. Talk to all of them.
12. Pick the loudest pain point from those conversations to start Phase 2.

---

*End of document. Update this file as the plan evolves; it is the single source of truth for what gets built when.*
