# SeamFlow — Phased Product Roadmap

**Owner:** Diamond
**Last updated:** July 6, 2026
**Repo:** `SeamFlow/` monorepo

**Current status:** Phase 0 complete (0.5 deferred). **Phase 1 is feature-complete and shippable**, and since the May snapshot the product has shipped several **Phase 2 and Phase 3 items early** (see "Shipped early" below). Only 1.7 (payments) is paused with all scope decisions parked, and 1.9.3 (Apple Sign-In) is deferred post-launch (user opted not to pay the $99/yr Apple Dev Program yet). Everything else end-to-end:

- 1.1 clients · measurements · templates · group orders + members + owner
- 1.2 orders · state machine · audit timeline
- 1.3 photos with two-variant WebP compression
- 1.4 offline-first incl. persisted mutation queue
- 1.5 magic-link order view (`seamflow-web` Next.js scaffold shipped with this)
- 1.6 WhatsApp deep-link share + OS share-sheet fallback
- 1.8 Expo push notifications (token register + order-transition triggers + test endpoint)
- 1.9 sign-in UX — email + OTP, Google OAuth (Apple deferred)
- 1.10 fuzzy client search + orders filter chips
- 1.11 PIN lock — 4-digit, hashed in `expo-secure-store`, 5-attempt force-signout, 5-min-background re-lock

**Pulled forward from later phases:** measurement templates (was 2.7), group orders + members + owner (was Appendix A.15). **Pre-1.10 architectural cleanup:** `clients.address` and `group_orders.owner_client_id` added; new atomic `POST /group-orders/with-members` creates owner-as-client (if new) + group + members in one transaction.

**Shipped early — Phase 2/3 work already live (June–July 2026):** the roadmap phase numbering below is preserved, but these later-phase items are already built and in the app. See each phase section for the detailed status:

- **Design Studio AI (3.11 M1–M3)** — inspiration library, attach-to-order, and AI photo→notes (Claude vision, `POST /ai/describe-image`, Accept/Edit/Discard). Only M4 (text→image generation) remains.
- **Reminders engine + calendar (2.5, partial)** — hourly cron reminder scan with de-dup log, localized (EN/FR) templates, Expo-push delivery, plus an in-app calendar screen. Device-calendar (`expo-calendar`) integration, automated WhatsApp client messages (2.6), and SMS (2.9) are still ahead.
- **Notification preferences + timezones** — per-tailor settings screen (due/overdue/status-change toggles, reminder lead days, reminder hour, IANA timezone picker) + API; reminders honor them.
- **i18n EN/FR (2.8, partial)** — the whole tailor app runs through a custom `t()` layer with a build-time i18n guard (`npm run i18n:check`) enforcing EN/FR parity. Six more languages + RTL + web i18n remain.
- **Device contacts picker** — unlisted addition: pick a client/owner from the phone address book (expo-contacts, E.164 normalized).

**Atelier design system (1.12):** `@seamflow/ui` foundation shipped — color tokens (Linen + Midnight palettes), Fraunces/Inter/JetBrains Mono typography, spacing/radii/shadows/motion tokens, primitives (Text/Button/Input/**Card**/**Chip**/**Avatar**/**IconButton**/**ListRow**), `AtelierThemeProvider`, font loading at app root. **Typography sweep + runtime light/dark mode complete.** **App-wide redesign shipped (2026-07-03):** composed dashboard, custom navigation shell (`ScreenHeader` + `FloatingLogo`), `OrderCard`, framed calendar grid. **Centered dialog system shipped (2026-07-05):** all 78 native `Alert` calls replaced by a themed `useDialog()` provider (alert/error/confirm/prompt/choose/pick), ESLint-enforced. **iOS readiness pass (2026-07-05, see 1.13):** image-picker Info.plist strings, iOS DateField sheet, permission-denial recovery. Remaining primitives: `Sheet` (in `@seamflow/ui`), `MeasurementInput`, `EmptyState`, `StitchLine`, `TabBar`, `Stepper`; bespoke/phosphor icons; on-device Linen validation — see `docs/design-system/CHANGELOG.md`.

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

**Mobile** *(as built: Expo SDK 55)*
- Expo SDK 55 (React Native 0.81) — plan originally said 52+
- Expo Router (file-based routing)
- EAS Build & EAS Update (managed builds and OTA updates)

**Web** *(as built: Next.js 15)*
- Next.js 15 (App Router) — plan originally said 14+
- Tailwind CSS
- shadcn/ui (component primitives)

**Backend** *(as built: Drizzle chosen)*
- NestJS (REST + WebSocket)
- Drizzle ORM (chosen over Prisma for TypeScript-first ergonomics)
- BullMQ (background jobs) + `@nestjs/schedule` (cron, used by the reminders engine)
- Zod (validation, shared via `@seamflow/schemas`)
- `@anthropic-ai/sdk` (Claude vision, `ai` module — Design Studio 3.11 M3)

**Data**
- Supabase (Postgres, Auth, Storage, Realtime, Row-Level Security)
- pgvector extension (for similarity search, Phase 3+)
- PostGIS extension (for geo discovery, Phase 3+)
- Upstash Redis (queues, caching, rate limits)
- ~~WatermelonDB (on-device SQLite)~~ — **not used**; offline-first is delivered via TanStack Query + AsyncStorage persistor + NetInfo (see 1.4 deviation note)

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

## Phase 0 — Foundation (week 1–2) ✅ COMPLETE

**Shipped May 18, 2026.** Sub-task 0.5 (CI/CD scaffolding) is intentionally deferred and will be picked up later — see note in 0.5 below. Two additions beyond the original spec were made during implementation and are worth flagging for future phases:

- A `group_orders` table + `orders.group_order_id` FK was added to the Phase 0.3 schema to support bridal parties, family events, and uniform orders from day one. See section 0.3 below and Appendix A.15.
- An append-only `order_events` table was added in Phase 0.3 (originally listed for Phase 1.2) so the audit log is in place before any order-status code is written.

The plumbing that has to exist before any user-facing work makes sense. Skipping this phase looks like time saved and never is.

### 0.1 Monorepo scaffolding ✅

- **What:** pnpm + Turborepo monorepo with `apps/` and `packages/` already laid out.
- **Why:** Avoid the eventual painful migration from a single-app repo to a multi-app one.
- **Tech:** pnpm, Turborepo, TypeScript project references.
- **Approach:** Already done. See repo root.
- **Dependencies:** none.

### 0.2 Shared types and schemas packages ✅

- **What:** Populate `@seamflow/types` with the canonical interfaces (`Client`, `Order`, `Measurements`, `OrderStatus`, `User`, `Tailor`). Populate `@seamflow/schemas` with matching Zod schemas. Wire `@seamflow/utils` with conversion helpers (cm⇄inches, phone normalization, currency formatting).
- **Why:** A single source of truth for the data model. Every app imports from here so a field rename never breaks two apps silently.
- **Tech:** TypeScript, Zod.
- **Approach:** Define types first, derive Zod schemas with `z.infer<>` where possible. Export both. Frontend uses Zod schemas in forms; backend uses them on every API boundary.
- **Dependencies:** monorepo scaffolding.

### 0.3 Supabase project + database schema ✅

- **What:** Spin up a Supabase project. Create the initial Postgres schema: `users`, `tailors`, `clients`, `measurements`, `orders`, `order_items`, `fabrics`, `payments`. Enable Row-Level Security and write the first policies.
- **Why:** Persistence is the single biggest unlock for the mobile app. Until this exists, nothing in the app survives a restart.
- **Tech:** Supabase, Postgres, SQL migrations.
- **Approach:** Manage schema via migrations in `apps/seamflow-api/migrations/`. Keep RLS policies in version control. Treat the schema as a public API contract.
- **Dependencies:** types/schemas package decided.

### 0.4 NestJS API skeleton ✅

- **What:** Boot `apps/seamflow-api` with NestJS, a `/health` route, Supabase client wired up, BullMQ + Redis configured, Sentry installed, Zod-based request validation.
- **Why:** Even before there are real endpoints, the API needs to deploy somewhere so the rest of the team can target it.
- **Tech:** NestJS, Drizzle ORM, Supabase JS client, BullMQ, Upstash Redis, Sentry, Zod.
- **Approach:** Use NestJS's modular structure. Each domain (clients, orders, payments, ai) becomes its own module. Drizzle schema lives alongside the API code and is the source of truth for the database shape.
- **Dependencies:** Supabase project.

### 0.5 CI/CD scaffolding ⏸️ DEFERRED

- **Status:** Intentionally skipped during the Phase 0 build. Pick up before Phase 1 ships to real users so PRs get lint + typecheck + test on every push. Not a Phase 1 blocker for development, but a regression risk without it.
- **What:** GitHub Actions workflows for lint, test, and deploy. Vercel preview deploys for `seamflow-web` and `seamflow-admin`. EAS Update channel for `seamflow-app`. Fly.io deploy on push to main for `seamflow-api`.
- **Why:** Catches "works on my machine" early. Gives the team confidence to ship daily.
- **Tech:** GitHub Actions, Vercel, EAS, Fly.io.
- **Approach:** Single `ci.yml` runs `turbo run lint test build` filtered to changed packages. Deploy workflows are per-app.
- **Dependencies:** all apps have minimal package.json (done).

### 0.6 Auth foundation ✅

- **What:** Supabase Auth with phone OTP enabled. A single `users` table with role enum (`tailor`, `tailor_staff`, `client`, `admin`). API middleware that verifies the JWT and attaches the user to every request.
- **Why:** Every feature past this point assumes users exist.
- **Tech:** Supabase Auth, NestJS guards.
- **Approach:** Phone OTP is the default because it works globally and matches how tailors think about their clients (by phone number). Email is a secondary option. Roles are enforced both in the API (route guards) and the database (RLS policies).
- **Dependencies:** Supabase project, API skeleton.

---

## Phase 1 — Launchable MVP (months 1–3) ✅ FEATURE-COMPLETE (1.7 paused, 1.9.3 deferred)

**Status as of May 20, 2026:** All sub-tasks shipped except 1.7 (Flutterwave payments — paused with decisions parked) and 1.9.3 (Apple Sign-In — deferred until Apple Dev Program is enrolled). Backend complete for clients, measurements, group orders, members, templates, orders, photos, sync foundation, share links, push notifications, device tokens. Mobile app on Expo SDK 55 with file-based routing, TanStack Query offline cache, persisted mutation queue, real email-OTP + Google OAuth sign-in, PIN lock, fuzzy search + filter chips. `seamflow-web` Next.js app exists for the magic-link order view. 9 smoke tests pass against the linked Supabase + real Expo push API.

What you need to put SeamFlow in the hands of 50 tailors in one city and have them actually use it daily. Every feature here directly replaces a paper-notebook task.

### Additions beyond the original Phase 1 spec

Some work was pulled forward from later phases or added during implementation. Worth flagging here so future-you knows where to find them:

- **Group orders + members + owner** (was Appendix A.15, scheduled mid-Phase 3) — full backend + mobile UI shipped with Phase 1.1. Each group has a `name`, `sharedDesignNotes`, `sharedFabricId`, optional `ownerMemberId`, and a list of members; each member can be linked to a real client OR ad-hoc (just a name). Members carry their own per-event measurements jsonb. Member ↔ client promotion + measurement copy operations live on the API.
- **Measurement templates** (was Phase 2.7) — table, RLS, full CRUD, mobile UI. Each template has a `fields: TemplateField[]` jsonb shaping the measurement form for a specific design. `measurement_sets.template_id` links a set back to the template it was filled against.
- **Order events / audit log** (was implied by 1.2 but built earlier) — `order_events` table is append-only; every status change writes an entry. Mobile order detail screen renders it as a timeline.
- **Two-variant image compression** (refinement on 1.3) — every photo upload generates both a 2048 px full (WebP q=82) and a 400 px thumb (WebP q=65). List/grid views load the tiny thumb; detail view loads the full. ~80% bandwidth reduction in list contexts.
- **Sync foundation tombstones table** — instead of soft-delete on every table, a `sync_tombstones` ledger + AFTER DELETE triggers record every deletion. Lets the sync pull endpoint return `{ created, updated, deleted }` per table without changing the existing hard-delete + CASCADE behaviour.
- **camelCase API surface** — all request bodies and response payloads use camelCase. DB columns stay snake_case (idiomatic SQL); the JS-side mapping happens at the ORM boundary.
- **Pre-1.10 architectural cleanup (2026-05-20)** — Two changes to streamline data entry on the mobile side:
  - `clients.address` (nullable text) added. Mobile new-client form is now exactly three required fields: name, phone, address. Edit screen keeps email + notes for richer follow-up data. Old data unaffected (column nullable, no backfill).
  - `group_orders.owner_client_id` (nullable FK → clients) added as the canonical owner pointer. Legacy `owner_member_id` retained for back-compat. New atomic endpoint `POST /group-orders/with-members` accepts `{ name, owner: <existingClientId | newContact>, members[] }` and runs the whole tree (optional new-client create + group insert + member bulk insert) inside one transaction. Mobile new-group-order screen is now a single form: title → owner picker (existing or inline) → members list → save once. Editing later uses the existing `PATCH /group-orders/:id` (now accepting `ownerClientId`) and the member add/remove endpoints from 1.1. Smoke covered by `pnpm test:groups-atomic`.

### 1.1 Persistent clients & measurements ✅ COMPLETE

- **What:** Tailor can create clients, edit them, search them, and store their measurements. Data persists across app restarts and syncs to the cloud.
- **Why:** The single most common action in the app. Without this nothing else matters.
- **Tech:** Supabase Postgres, WatermelonDB (on-device), `@seamflow/api-client`, `@seamflow/schemas`.
- **Approach:** Mobile app reads/writes to local WatermelonDB. A sync engine reconciles with Supabase on a schedule and when the network reappears. Measurements use a flexible JSONB column so we can later add per-garment templates without a schema migration.
- **Dependencies:** Phase 0 complete.

### 1.2 Orders with status workflow ✅ COMPLETE

- **What:** Tailor creates an order against a client. Orders carry `orderName`, `dateOrdered`, `dateDelivery`, `notes`, `status` (registered → in_progress → testing → on_pause → delivered).
- **Why:** This is the core unit of work for a tailor. Status changes are what clients want updates on.
- **Tech:** Same stack as 1.1 plus a status state machine encoded in `@seamflow/utils`.
- **Approach:** Status transitions are validated server-side so invalid jumps ("delivered" → "in_progress") are rejected. Every status change is recorded in an `order_events` table for the future timeline view.
- **Dependencies:** 1.1.

### 1.3 Photos on orders ✅ COMPLETE *(storage backend deviation)*

- **What:** Attach reference images, fabric swatches, and final-result photos to an order. Pull from camera or gallery.
- **Why:** Tailoring is visual. The biggest gap in the v0 app.
- **Tech:** Expo Image Picker, Expo Image Manipulator, **Supabase Storage** *(deviation from R2)*. Two-variant WebP compression: 2048 px full + 400 px thumb.
- **Deviation note:** The ROADMAP says Cloudflare R2 + Cloudflare Images. Used Supabase Storage instead to avoid adding another vendor — same Supabase project, same auth, no Cloudflare account required. Storage paths (not URLs) are stored in Postgres exactly as the ROADMAP recommends, so swapping to R2 later is a localized change in `OrderPhotosService` + the mobile `photo-upload.ts`.
- **Approach:** Mobile uploads directly to Supabase Storage with the user JWT (storage RLS gates writes by tailor folder); API registers metadata in `order_photos` table; signed URLs (~1 h TTL) returned with every list/get for display. WebP fallback to JPEG on devices that reject WebP encoding.
- **Dependencies:** 1.2.

### 1.4 Offline-first sync ✅ DONE *(local DB engine deviation)*

- **What:** App works fully offline. Reads serve from the persisted cache, writes pause until reconnection and replay automatically — even if the user kills the app while offline.
- **Why:** Target markets have patchy data. A tailor in a market stall can't lose an order because the WiFi dropped.
- **Tech:** **TanStack Query + AsyncStorage persistor + NetInfo** *(deviation from WatermelonDB)*. Server-side `POST /sync/pull` endpoint returns `{ created, updated, deleted }` per table since `lastPulledAt`; backed by `sync_tombstones` triggers.
- **Deviation note:** The ROADMAP says WatermelonDB + SQLite. The Expo SDK 55 + pnpm monorepo combo had us at risk of native-module pain (we hit it in 1.4 prep), and the user-visible behaviour the ROADMAP promises ("works fully offline... edits queue up... sync when reconnected") is fully delivered without SQLite. At a tailor's data scale (<2000 records) the trade-off is invisible. Swap to WatermelonDB later if and when usage demands SQLite-indexed scaling — pattern is the same shape on top.
- **Status:**
  - ✅ Backend pull endpoint + tombstones + RLS (1.4.1)
  - ✅ Mobile offline-first reads + in-memory paused mutations + offline banner (1.4.2)
  - ✅ Persisted mutation queue (1.4.3 polish) — paused mutations survive app kill. Implemented via TanStack Query `setMutationDefaults` + persistor `shouldDehydrateMutation`. Hooks (`useTransitionOrder`, `useUpdateOrder`, `useDeleteOrder`, `useCreateOrder`) wrap variable-shape into `{ id, input }` so dehydrated entries carry everything needed to replay.
  - ✅ Optimistic update on `transitionOrder` — status pill flips instantly, rolls back on error via cached snapshot.
  - ✅ MutationCache cleared on sign-out so paused mutations can't fire under the next-signed-in user's JWT.
  - ✅ OfflineBanner shows three states: red "offline + N pending", red "offline", amber "Syncing N change(s)…" (visible while a previous-session offline queue drains).
  - ⏳ Photo upload offline queue — still deferred. Photos are large blobs; AsyncStorage isn't the right place. When/if needed, a Phase 2 task can introduce `expo-file-system` queue + flush-on-reconnect.
- **Dependencies:** 1.1, 1.2.

### 1.5 Magic-link order view (seamflow-web) ✅ DONE

- **What:** When a tailor opens an order, they tap "Share with client" — the native share sheet opens (WhatsApp/SMS/Mail/etc.) with a magic link. Client taps it, lands on a mobile-friendly web page showing order details, status, fitting date, photos, and items. No install required.
- **Why:** This is what turns SeamFlow from a CRM into a two-sided product without forcing clients to install an app.
- **Tech shipped:** NestJS endpoints (`POST /orders/:id/share-link`, public `GET /public/orders/:token`), JWT signing (HS256, separate secret from Supabase), Next.js 15 App Router (`apps/seamflow-web`) with Tailwind CSS, server-rendered page at `/o/[token]`, server-side fetch via `@seamflow/api-client`.
- **Token rules:** HS256 JWT, 60-day hard TTL via `exp`. Soft expiry: if the order has been `delivered` for more than 2 days, the link rejects regardless of `exp` (returns 410 Gone). Token bakes order id + tailor id; tailor-mismatch on verify returns 401. Tokens are regenerated on every share — we don't cache them.
- **Deferred:** Hosting (will deploy to Vercel later — `WEB_BASE_URL` env points at `localhost:3000` in dev). Revocation list. Phone-OTP upgrade to a tracked client account (Phase 3.1 territory).
- **Smoke test:** `pnpm --filter seamflow-api test:share-links` covers: issue → public resolve (no auth) → tampered token rejected → forged token rejected → garbage token rejected → delivery+2d in-window still resolves → cross-tenant probe 404.
- **Dependencies:** 1.2, API auth.

### 1.6 WhatsApp share links ✅ DONE

- **What shipped:** Tapping "🔗 Share with client" on an order mints a fresh magic link, then tries to open WhatsApp directly with the client's phone number pre-loaded. Falls back to the OS share sheet (SMS / Mail / etc.) when no phone is on file or WhatsApp isn't installed.
- **Tech shipped:**
  - `@seamflow/utils` — `formatOrderShareMessage()` (template the body in one place so Phase 2.5 i18n can swap copy) + `phoneToWaMeDigits()` (strip non-digits for `wa.me`).
  - `apps/seamflow-app/lib/share-order.ts` — `useShareOrder(orderId)` hook returning `{ share, isPending }`. Tries `whatsapp://send?phone=…&text=…` first, then `https://wa.me/<digits>?text=…`, then `Share.share`. All errors caught — never throws to the caller.
  - `apps/seamflow-app/app.json` — added `LSApplicationQueriesSchemes: ["whatsapp"]` so iOS `canOpenURL('whatsapp://…')` returns honestly.
- **Approach details:**
  - Client phone is read from the database (stored E.164 — validated by libphonenumber-js on save). The hook strips the `+` and spaces for `wa.me`.
  - Message format: `"Hi {firstName} — here's your order: {orderName}\n\nView details: {url}\n\n— {businessName}"`. First name only (avoids long honorifics). Greeting falls back to `"Here's your order — {name}"` when no client name.
  - Android quirk: `canOpenURL('https://…')` sometimes returns false for browser URLs; we blind-attempt `openURL(wa.me)` as a last resort on Android only.
  - The OS share sheet always carries the URL inside the message body because Android collapses the separate `url` field anyway.
- **Deferred:** i18n of the template body (Phase 2.5). WhatsApp Business API integration (out of scope — `wa.me` is fine for self-serve tailors).
- **Dependencies:** 1.5.

### 1.7 Deposit collection ⏸ PAUSED — decisions parked

**Status:** Paused 2026-05-19. User wants to work on other Phase 1 items first. Decisions already made (when picked back up, don't re-ask):

- **Provider:** Flutterwave (sole provider, hosted checkout). Covers cards + MTN MoMo CM + Orange Money CM in one integration.
- **Currency:** Multi-currency from day 1 (XAF / USD / EUR). Constraint: MTN MoMo and Orange Money are XAF-only rails — the UI must hide MoMo/OM when the order is denominated in USD/EUR.
- **Scope:** Deposit on order (partial) ✓ · Multiple payments per order ✓ · Refunds **deferred** to post-launch.
- **Pay flow:** Inside the magic-link web page (`/o/[token]` on seamflow-web). Client taps "Pay deposit" → Flutterwave hosted checkout opens → redirect back to the same page with confirmation. No in-app payment flow needed at MVP.
- **Account:** User does not yet have a Flutterwave account. Will sign up fresh when implementation begins (KYC: RCCM, NIU, director ID, proof of address, XAF bank account; 3–7 business days). Sandbox keys issue immediately on signup so dev is unblocked even before KYC.
- **Original Phase 1.7 spec (reference):** A `/payments/initiate` endpoint returns a provider-specific checkout payload; webhook handler (`/webhooks/flutterwave`) verifies the signature, idempotently records the payment, transitions the order's paid total, and fires a push to the tailor via `NotificationsService` (already wired and exported by 1.8). Refunds deferred to post-launch.
- **Dependencies:** 1.5.

### 1.8 Push notifications ✅ DONE

- **What shipped:** Tailor gets a push every time an order moves between statuses, plus a "🔔 Send test notification" button on the Me screen for round-trip verification. Permission is requested right after sign-in. Tokens auto-prune when Expo reports them as dead.
- **Tech shipped:**
  - **DB:** `device_tokens` table (migration `20260519220000_device_tokens.sql`) — one row per user per device, unique on `(user_id, expo_token)`, RLS scoped to `auth.uid()`.
  - **NestJS:** `NotificationsService` (`apps/seamflow-api/src/notifications/`) calls Expo's REST API directly (`https://exp.host/--/api/v2/push/send`), 100-msg batching, async-cleanup of `DeviceNotRegistered` tokens. Routes: `POST /me/device-tokens`, `DELETE /me/device-tokens/:token`, `POST /me/push-test`.
  - **Wiring:** `OrdersService.transition()` calls `notifications.fireAndForget(ownerUserId, …)` after a successful state change — non-blocking, errors swallowed so notification failures never break the transition.
  - **Mobile:** `expo-notifications` + `expo-device` installed. `apps/seamflow-app/lib/notifications.ts` exposes `ensurePushRegistered()` / `unregisterPushOnSignOut()` / `sendPushTest()`. Auth context fires registration on `SIGNED_IN` / `INITIAL_SESSION` and deregisters on `SIGNED_OUT`. iOS LSApplicationQueriesSchemes already set in 1.6.
- **Triggers wired:** Order status transitions ✓ · `/me/push-test` for manual verification ✓ · **Payment received deferred** — Phase 1.7 will call `notifications.fireAndForget(userId, …)` from the Flutterwave webhook handler when it lands. NotificationsService is already exported, no wiring change needed on resume.
- **What works without a physical device:** Token shape validation (regex on `Expo(nent)?PushToken[…]`), upsert idempotency, invalid-token cleanup via real Expo responses, `DELETE` idempotency, status-transition trigger wiring. All covered by `test:notifications` (7 checks pass against live Expo API).
- **What needs a physical device:** Permission prompt, real token issuance, actual notification delivery, banner UX, tap-to-navigate. Expo Go on a real phone is sufficient — no Apple Dev / FCM setup required until production builds.
- **Production-build TODO (not now):** iOS needs Apple Dev Program ($99/yr) for APNs; Android needs a free Firebase project for FCM. Both are EAS-Build-time concerns.

### 1.9 Authentication — sign-in UX ✅ DONE (Apple deferred)

- **Scope (decided 2026-05-19):** Three real sign-in methods replace the "Continue as dev" shortcut: email/password with required email-OTP verification, Google OAuth, Apple Sign-In. Build order: email/OTP → Google → Apple. Apple gated on the $99/yr Apple Developer Program — **user deferred Apple to post-launch**, so 1.9 ships Email + Google only. iOS will run for dev/TestFlight but cannot pass App Store review until Apple Sign-In is added later (App Store policy 4.8).
- **Status:**
  - ✅ Email + password sign-up with email-OTP verification (1.9.1)
  - ✅ Google OAuth (1.9.2) — PKCE flow via `signInWithOAuth` + `expo-web-browser` in-app browser + `exchangeCodeForSession`. Verified working end-to-end on Android emulator 2026-05-19. iOS/Android **native** client IDs (smoother UX, no browser handoff) deferred until EAS dev build / Apple Dev Program respectively — Web client covers both platforms via in-app browser today.
  - ⏸ Apple Sign-In (1.9.3) — deferred post-launch, gated on $99/yr Apple Dev Program
- **1.9.1 shipped — email + OTP:**
  - `signUpWithPassword` → Supabase sends 6-digit OTP → user enters code on a dedicated `/verify-otp` screen → `verifyOtpSignup()` confirms email and creates the session.
  - Sign-in with an unconfirmed email auto-routes to `/verify-otp` instead of showing a raw error.
  - Resend button has a 30 s UI cooldown on top of Supabase's server-side rate limit.
  - "Continue as dev" button removed from the sign-in screen (along with the `EXPO_PUBLIC_DEV_EMAIL` / `EXPO_PUBLIC_DEV_PASSWORD` config). The existing `auth-test@seamflow.local` user still works via normal email/password for smoke tests.
- **Dashboard config required from user (one-time):**
  - Supabase → Auth → Email Templates → "Confirm signup" → swap `{{ .ConfirmationURL }}` for `{{ .Token }}` so the email delivers the 6-digit OTP instead of a confirmation link.
  - Optional: edit subject line to "Your SeamFlow code: {{ .Token }}".
- **Dependencies:** Phase 0.6 (auth foundation), 1.1 (tailor profile creation that the new user flows into post-sign-up).

### 1.10 Basic search & filtering ✅ DONE

- **What shipped:** Fuzzy client search by name or phone (trigram-backed). New global orders list screen with status filter chips, time chips ("Overdue" / "Due this week" / "All time"), and free-text search across order name. Paid/unpaid filter intentionally deferred until 1.7 (payments) lands — no `payments` rows to filter against today.
- **Backend additions:**
  - `GET /clients?q=` was already trigram-backed via the GIN indexes from 0001 init — verified the underlying `ILIKE %q%` plan actually uses the index.
  - `GET /orders?q=&dueBefore=&dueAfter=` filter params added. `q` matches `order_name` via `ILIKE` (trigram index on order_name is a Phase 2 polish if profiling shows it's hot). `dueBefore` / `dueAfter` map to inclusive `lte`/`gte` on `date_delivery`; orders with NULL `date_delivery` are excluded from either range.
- **Mobile additions:**
  - New `apps/seamflow-app/lib/use-debounced-value.ts` (250 ms hook) — used by both list screens so search doesn't fire on every keystroke.
  - New global orders list at `app/(app)/orders/index.tsx` — status chips, time chips, free-text input. Each card shows status pill + delivery date.
  - Home screen gets a new "Orders" tile pointing at the global list (was previously per-client-only).
  - Clients list refactored to use the shared `useDebouncedValue` hook + now shows `address` on each card (visible payoff of the 1.x architectural refactor).
- **Smoke covered by** `pnpm test:search-filters` (9 checks: trigram name match, phone-fragment match, garbage→empty, status filter regression, order-name match, `dueBefore`, `dueAfter`, range, NULL-delivery exclusion).
- **Dependencies:** 1.1.

### 1.11 PIN lock (post-sign-in app gate) ✅ DONE

- **What shipped:** Optional 4-digit PIN that gates the (app) routes when the app is backgrounded for ≥ 5 minutes, OR on cold start. Set / change / remove from a new Profile → "🔐 PIN lock" screen. PIN itself is hashed (HMAC-SHA-256 + per-install random salt via `expo-crypto`) and stored in `expo-secure-store` — the raw PIN never lands anywhere, and the device's OS keychain provides the underlying encryption.
- **Failure handling:** Wrong PIN wiggles + shows attempts remaining; 5 wrong tries forces sign-out (clears Supabase session). PIN is also cleared on every sign-out so a second tailor sharing the device isn't locked behind the first user's PIN.
- **What's gated:** Every screen inside the `(app)` group. Sign-in, signup, and OTP verify screens are explicitly outside the gate — there's nothing to lock when no one is signed in.
- **What this *isn't*:** Biometric (Face ID / fingerprint) is deferred to a later phase. The lock is local-only — no server round-trip — so it works fully offline and adds zero backend surface.
- **Files added:**
  - `apps/seamflow-app/lib/pin-lock.ts` — secure-store + hash + failed-attempt counter; constants `PIN_LENGTH=4`, `MAX_ATTEMPTS=5`, `LOCK_AFTER_BACKGROUND_MS=5min`.
  - `apps/seamflow-app/lib/lock-context.tsx` — React context tracking `{ ready, pinSet, locked }`. AppState listener stamps a `lastBackgroundedAt` ref and flips `locked` on the next foreground when the elapsed exceeds the threshold.
  - `apps/seamflow-app/components/PinLockScreen.tsx` — full-screen numeric keypad + dot indicator + "Forgot PIN? Sign out" escape hatch.
  - `apps/seamflow-app/app/(app)/pin.tsx` — set / change / remove flow with a small `Stage` state machine (menu → enterCurrent → enterNew → confirmNew).
  - `(app)/_layout.tsx` wraps the Stack in `<LockProvider>` and swaps in `<PinLockScreen>` when `locked && pinSet`. A small `<GatedStack>` waits for the initial pinExists() probe so no first-paint flash of the home screen.
- **Open follow-ups (later phases):** biometric unlock, per-account "remember this device for N days" toggle, server-side audit of failed-attempt counts.

### 1.12 Atelier design system 🟡 IN PROGRESS *(tailor app fully migrated; light/dark live)*

A visual-identity refresh + extraction of design tokens and primitives into `@seamflow/ui` so the tailor app, the magic-link web app, the future client mobile app, and the future admin web app all draw from one source. **This is a refactor, not a rebuild** — same screens, same data flow, same navigation, new skin.

**Brand concept — "Atelier":** seam (stitch, craft) + flow (motion, ease). Workshop-meets-boutique. Warm undertones, Fraunces serif for titles, Inter for UI, JetBrains Mono with tabular figures for measurements. Springs everywhere. Two modes, same DNA — **Linen** (light, customer-facing) and **Midnight** (dark, tailor default).

**Hard rules** (enforced by review, lint later):
- No pure black, no pure white.
- No RGB-pure primaries (`#0000ff` is gone forever).
- No hard-coded color / font / radius / spacing in app screens — tokens only via `@seamflow/ui`.
- No flat `<TextInput>` slabs — always the `Input` primitive.
- No linear easing — springs by default.

**Foundation shipped (2026-05-20):**

- **`packages/ui` is now a real package.** 7 token files: `colors` (linen + midnight semantic sets), `typography` (Fraunces / Inter / JetBrains Mono with 9-variant scale), `spacing` (4 px grid), `radii` (none → pill), `shadows` (warm-derived for linen, surface-elevation for midnight), `motion` (3 springs + 3 durations + 1 easing), `theme` (`createTheme()` factory + `linenTheme` + `midnightTheme` + `toCssVariables()` for future web Tailwind preset).
- **`AtelierThemeProvider`** with `mode` or pre-built `theme` prop. Lightweight, no Restyle context dependency, so the package works without app-side type augmentation.
- **3 primitives shipped:**
  - `Text` — `variant` × `tone` × `numeric` props. Single text primitive. No raw `<Text>` in screen code after migration.
  - `Button` — `primary` / `secondary` / `ghost` / `destructive` × `sm` / `md` / `lg`. Pill radius, scale-to-0.97 spring on press, icon slots, loading state.
  - `Input` — floating label, hairline border, focus ring, leading/trailing slots, error/helper captions. `placeholder` honored as in-field hint after the label floats.
- **Tailor app rewired in place** (no parallel `src/`, working inside the existing `app/`, `lib/`, `components/`):
  - `lib/theme.ts` back-compat shim maps legacy `{ colors, spacing, radii }` onto Atelier midnight tokens — one-file change flipped the entire app's palette without screen churn.
  - Fonts loaded via `@expo-google-fonts/{fraunces,inter,jetbrains-mono}` at root, gated first paint until ready.
  - `AtelierThemeProvider mode="midnight"` wraps the auth provider.
  - Legacy `components/Button.tsx`, `Input.tsx`, `Tile.tsx` rewritten as thin Atelier adapters → Fraunces / Inter / pill buttons / floating-label inputs appear on every screen at once.
  - Direct primitive migration: `sign-in.tsx`, `(app)/index.tsx` (home), `(app)/me.tsx` (profile) on `@seamflow/ui` Text imports.
  - Nav-bar titles render in Fraunces.

**Shipped since foundation (2026-05-29 → 05-30):**

- **`Card` + `Chip` primitives** landed in `packages/ui`. `Chip` carries the status-pill tones (registered / in_progress / testing / on_pause / delivered), deleting the last hard-coded status hexes (`#f5a524`, `#e35d6a`) from the order screens.
- **Full typography sweep — done.** Every screen migrated off raw React Native `<Text>` onto the Atelier `<Text>` primitive (variants × semantic tones): orders list/detail, clients list/detail, group list/detail/new, templates list/detail/new, new-order wizard, verify-otp, pin, plus shared components (Screen, DateField, OfflineBanner, PinLockScreen). `grep` confirms zero raw-RN `Text` imports and zero `#rrggbb` literals under `app/`.
- **Runtime light/dark mode — done.** `lib/theme-mode.tsx` (`ThemeModeProvider` + `useThemeMode`) owns a `system | light | dark` preference, persisted to AsyncStorage and resolved against the OS scheme. A reactive `useThemeColors()` hook + the auto-reactive `<Text tone>` make every screen re-render on mode change; `radii`/`spacing` stay static (mode-invariant). Toggle UI is a segmented control on Profile → **Appearance**. Verified live on the Pixel 9 Pro XL: System/Light → Linen, Dark → Midnight, switching instantly with no nav-state reset.

**Shipped since (2026-06 → 07):**

- **Tablet / landscape responsive support** (2026-06-03) + home calendar tile.
- **App-wide redesign (2026-07-03).** Composed dashboard (greeting hero + live-count tiles + "Due soon" rail), custom navigation shell (`components/ScreenHeader` + bottom-center `components/FloatingLogo` with scroll-driven fade), `components/OrderCard` (status accent + overdue/due-in), framed Monday-first calendar grid. New `@seamflow/ui` primitives: `Avatar` / `AvatarStack` (deterministic name→tone), `IconButton`, `ListRow`. Status + due-date logic centralized in `lib/order-status.ts`.
- **Centered dialog system (2026-07-05).** All 78 native `Alert.alert` / `Alert.prompt` calls replaced by a global `DialogProvider` + `useDialog()` (`lib/dialog.tsx`): `alert` / `error` / `confirm` / `prompt` / `choose` (centered stacked menu) / `pick` (bottom sheet, reuses `OptionSheet`). Themed, promise-based, animated (reduced-motion aware). An ESLint rule fails the build if `Alert` is reintroduced.
- **Order-detail redesign** — elevation-based hierarchy (summary card, item cards, measurement tags, timeline nodes) using the Atelier shadow tokens.

**Coming next (one screen per pass, with review):**

- Primitives: `Sheet` (extracted into `@seamflow/ui`, replaces the bespoke `<Modal>` sheets), `EmptyState`, `MeasurementInput` (signature interaction — horizontal ruler with tick haptics, mono digits), `StitchLine` (signature success microinteraction), `TabBar`, `Stepper`.
- Icons: `phosphor-react-native` (regular weight, 1.5 px stroke) replaces `@expo/vector-icons` usage; bespoke SVG tailoring icons in `packages/ui/src/icons/` (measuring tape, dress form, scissors, thread spool, swatch, mannequin).
- Deeper interaction migration: client detail (→ `Sheet`), new-order (→ `MeasurementInput`).
- Light-mode polish: Linen has now rendered on-device for the first time — sweep for any low-contrast muted text / borders surfaced by real use.
- Web parity: same tokens emit as CSS custom properties + a Tailwind preset; `seamflow-web` adopts them when it grows past the single `/o/[token]` page.

**Docs:** `packages/ui/README.md` (token reference + usage), `docs/design-system.md` (brand concept + hard rules), `docs/design-system/CHANGELOG.md` (entry per migration).

**Dependencies:** All of Phase 1 — the system is being applied as a polish pass over already-shipped functionality.

### 1.13 iOS readiness & platform hardening 🟡 IN PROGRESS *(2026-07-05)*

Development and testing have been **Android-only** through Phase 1. A hardening pass closed the iOS-divergent gaps that would break on a first iPhone run:

- **Camera / photos** — registered the `expo-image-picker` config plugin with iOS usage strings (`NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`). Without these iOS *hard-crashes* the moment the camera or gallery is opened. **Requires a native rebuild (`expo prebuild` + iOS build / EAS) to take effect — does not hot-reload.**
- **Date picker** — `components/DateField` now hosts the iOS picker in a dismissible bottom sheet with Cancel / Done (the native inline picker has no dismiss and trapped the user); Android keeps its native dialog.
- **Permission denial** — `lib/permissions.ts` + the dialog system show a localized "permission needed" prompt with an **Open Settings** path when the OS won't re-ask (iOS never re-prompts after the first denial). Wired into camera/photos/contacts flows.

**Still open for iOS launch:**

- **APNs push credentials** must be configured in EAS — Expo push (1.8) **silently fails on iOS** until then.
- **Apple Sign-In (1.9.3)** — still gated on the $99/yr Apple Developer Program; blocks App Store review (policy 4.8).
- On-device iOS QA of every screen (esp. safe-area / notch, keyboard, swipe-back).

**Dependencies:** 1.3 (photos), 1.8 (push), 1.9 (auth).

**Phase 1 exit criteria:** 50 paying tailors, daily active use, < 1% sync error rate, average response time under 300 ms on 3G, monthly recurring revenue covering hosting costs.

---

## Phase 2 — Sticky features (months 4–6)

Features that turn a useful tool into a tool tailors won't stop paying for. Most of these are pulled from real complaints during Phase 1.

### 2.1 Multi-staff accounts ⬜ NOT STARTED *(schema stub only)*

**Status:** STUB — the `tailor_staff` value exists in the user-role enum, but there is no staff table, invite flow, per-role RLS, or management UI yet.

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

### 2.3 Fabric library ⬜ NOT STARTED *(schema stub only)*

**Status:** STUB — a `fabrics` table exists in the schema (and `group_orders.shared_fabric_id` references it), but there is no fabric CRUD service/controller or mobile UI yet.

- **What:** Tailor photographs fabrics they have in stock, records supplier, yardage, and cost. Attach fabrics to orders.
- **Why:** Closes the loop between cost of goods and order pricing.
- **Tech:** Same image stack as 1.3. New tables `fabrics`, `order_fabrics` (junction).
- **Approach:** Fabric photos use the Cloudflare Images variants for thumbnails. Search by color, supplier, or composition. Later this becomes the basis for the "what have I made with this fabric before" view.
- **Dependencies:** 1.3.

### 2.4 AI: order-notes summarization ⬜ NOT STARTED *(may be superseded)*

**Status:** NOT STARTED. Note: the Design Studio AI photo→notes (3.11 M3) is already live and shares the exact `ai` module + Accept/Edit/Discard pattern this would need — so an order-notes "Tidy up" is now cheap to add. Decide whether to keep this as a distinct feature or fold it into the existing `ai` module.

- **What:** Tailor scribbles messy notes; a "Tidy up" button produces a clean, structured summary the client can read.
- **Why:** Lowers friction at the counter. Tailors hate writing detailed notes.
- **Tech:** Claude API (Haiku for speed, Sonnet for quality). Wrapped in `@seamflow/api-client`'s `ai.summarize()`.
- **Approach:** Free tier gets 10 summaries/month, paid is unlimited. Cache results by note hash to avoid re-billing. Always show the user the original alongside the AI version with an "Accept / Edit / Discard" flow.
- **Dependencies:** API skeleton; some tailor-facing data.

### 2.5 Calendar with fitting reminders 🟡 PARTIAL — engine + calendar shipped

**Status (2026-07):** SHIPPED — an hourly cron reminder scan (`@nestjs/schedule`) with a `order_reminder_log` de-dup ledger, localized EN/FR templates, and Expo-push delivery that honors per-tailor **notification preferences** (due / overdue / status-change toggles, reminder lead days, reminder hour, IANA timezone) via `GET`/`PATCH /me/notification-preferences` and the `notification-preferences` mobile screen; plus an in-app calendar screen (`app/(app)/calendar`, month grid + day list). STILL AHEAD: device-calendar (`expo-calendar`) export, **automated WhatsApp** client messages (needs 2.6), local-device reminders, and per-client opt-out.

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

### 2.8 Multi-language i18n 🟡 PARTIAL — EN/FR shipped

**Status (2026-07):** PARTIAL — the tailor app is fully bilingual **English + French** through a custom lightweight `t()` layer (`lib/i18n/`, locale dicts per area) with a build-time guard (`npm run i18n:check`) that fails the build on a missing key, EN/FR key drift, or a hardcoded user-facing string. STILL AHEAD: Yoruba, Hausa, Hindi, Urdu, Tagalog, Arabic; RTL for Arabic/Urdu; and web (`seamflow-web`) i18n. Note: implemented as a custom dictionary, **not i18next** — revisit that choice if the language count grows.

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
- **Approach:** Tailor opt-in (privacy default off). Reviews tied to completed orders only — no review-bombing from non-customers. Profile pages public on `www.seamflowtech.com/tailor/<slug>` for SEO.
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

### 3.11 Design Studio — AI design generation (text + reference → image) 🟡 M1–M3 SHIPPED EARLY (during Phase 1); M4 remaining

> Foundation already shipped/scaffolded — see `docs/design-studio-moodboard-plan.md`.
> **M1 (inspiration library / moodboard)** and **M2 (attach inspiration to an
> order)** are live. **M3 (AI auto-describe, image→text via Claude vision)** is
> built end-to-end (NestJS `ai` module + mobile sheet) and only needs a funded
> `ANTHROPIC_API_KEY` to turn on. This item, **M4**, is the remaining and most
> ambitious piece: generating *new* design imagery from a prompt plus reference
> images (e.g. a fabric photo).

- **What:** In the Design Studio "Generate" tab, a tailor types a prompt ("flowing Ankara gown, off-shoulder, mermaid silhouette") and optionally attaches reference images (a fabric swatch, a silhouette they like). The model returns generated inspiration imagery that saves straight into the inspiration library and can be captioned, tagged, and attached to an order like any other design.
- **Why:** Turns SeamFlow from a record-keeper into a creative partner. A tailor can co-design with a client on the spot ("here's your lace, here are three gown ideas in it") — a strong differentiator and demo moment for fashion-forward users.
- **Reality check (scope guardrail):** Generation produces *inspiration imagery* — a look, silhouette, fabric-on-garment mockup — NOT sewing patterns or cut-ready specs. A fabric photo is used as a **style/texture reference**, not a literal guarantee. Position it as inspiration in all copy so tailors don't expect production output.
- **Tech:**
  - **Model access via an aggregator (fal.ai or Replicate)** — one API + hosting, pay-as-you-go, no GPUs to run, and provider-swappable in one line of the worker. Directly-integrated providers are a later optimization.
  - **Model:** a *multi-reference* image model so the fabric/silhouette inputs are actually respected. Current strong candidates (re-evaluate at build time — this space moves monthly): **Google Nano Banana 2 (Gemini image)**, **FLUX.2 [pro]**, or **Seedream 4.5** — all accept many reference images at **~$0.03 per 1024px image** (≈10× the auto-describe cost, still cents). Start with Nano Banana 2 or FLUX.2 for reference adherence.
  - **Async via the existing queue** (BullMQ + Upstash Redis, already in `QueueModule`). Generation takes ~5–30s, far too slow for an inline request.
  - New env var `FAL_API_KEY` (optional at boot, same pattern as `ANTHROPIC_API_KEY` — endpoint returns 503 when unset).
- **Data model:** already prepared. The `designs` table has `source` (`'uploaded' | 'generated'`) and a `prompt` column, so generated images land in the same library with their prompt recorded. Reference images are uploaded to the existing private `designs` bucket and passed to the model as signed URLs. May add a small `design_generations` job table if we want per-attempt status/history.
- **Approach (backend):** `POST /designs/generate { prompt, referenceDesignIds?, aspectRatio? }` validates + enqueues a job and returns a job id immediately. A worker: resolves signed URLs for any reference images → calls the model via fal → downloads the result → runs it through the existing two-variant compress pipeline → stores it in the `designs` bucket as a `source: 'generated'` row with the prompt → marks the job done. Enforce a **per-tailor monthly quota** and cache nothing (each generation is unique) but record cost per job.
- **Approach (front end):** a **"Generate" tab** in the Design Studio (the tile was built to host it). Prompt box + optional reference-image picker (reuse the existing photo picker) + light controls (aspect ratio, a style hint like "editorial photo" vs "flat sketch"). Because it's async, tapping **Generate** immediately drops a **placeholder card with a spinner** into the grid; the app polls (or receives an `expo-notification`) and swaps in the finished image, so the tailor can keep browsing meanwhile. Results auto-save into the library. Show a small **credits/est-cost** indicator and a clear **retry** on failure.
- **Cost & safety:** no free tier (funded provider account required); ~$0.03/image means quotas matter before real users can burn credits. Providers apply their own content moderation, which is acceptable for a tailoring context.
- **Dependencies:** Design Studio M1–M3 (`docs/design-studio-moodboard-plan.md`); `QueueModule`; a funded fal.ai/Replicate account. Pairs naturally with 3.7 (embeddings → "generate variations of a saved design").

### 3.12 Marketing landing page + legal pages + in-app policy links

> **Build only — do NOT deploy.** Build everything locally so it can be reviewed
> (`pnpm --filter seamflow-web dev`) before we point a domain / ship to Vercel.
> All work lives in the existing `apps/seamflow-web` (Next.js 15 App Router,
> React 19, Tailwind 3.4) plus small additions to the mobile app. Use
> `www.seamflowtech.com` as the placeholder domain everywhere (swap later).

- **What:** A public marketing site for SeamFlow (what it does, the value, the
  vision) + a hosted **Privacy Policy** and **Terms** page, and links from inside
  the mobile app that open the policy in an in-app browser.
- **Why:** Drives downloads, looks credible for app review, and satisfies the
  hard requirement that both stores have a public privacy-policy URL.

#### A. Design direction (do this first)

Same **Atelier** identity as the app, but a touch **poppier / more saturated** —
tasteful, not neon. The app uses tokens in `packages/ui/src/tokens/colors.ts`;
port an adjusted set into the web's Tailwind theme (`tailwind.config.ts` +
`app/globals.css` CSS variables). Suggested web palette (tune to taste):

- Background (warm cream): `#FBF8F3`
- Surface / cards: `#F4EEE3` (warm off-white — keep the no-pure-black/white rule)
- **Primary (poppier indigo-violet):** `#5A46E0` (vs the app's `#2E3A8C`)
- Primary tint / gradient stop: `#A89CFF` (the app's silk lavender)
- **Warm accent (bright coral-peach):** `#F0875A` (vs the app's copper `#C97B5C`)
- Success: `#2FBF95` (brighter mint)
- Text ink: `#1A1714`; muted `#5B554F`; hairline `rgba(26,23,20,0.08)`

Type: **Fraunces** (display/headings) + **Inter** (body) via `next/font/google`.
Allow subtle primary→lavender gradients on hero accents/buttons, used sparingly.
Generous whitespace, large rounded cards (radius ~20–24px), soft shadows.

#### B. Pages / routes (in `apps/seamflow-web/app`)

- `/` — the landing page (replace the current placeholder `app/page.tsx`).
- `/privacy` — Privacy Policy (see section D).
- `/terms` — Terms of Service (short, standard).
- `/support` — a simple contact/support page (email + FAQ links). Optional but nice.
- Keep existing `o/[token]` and `i/[token]` routes untouched.
- Add `sitemap.ts`, `robots.ts`, and `opengraph-image` (OG share image).

#### C. Landing page sections (top → bottom)

1. **Header/nav** — logo, anchor links (Features, How it works, FAQ), a "Get the
   app" button, language toggle (EN/FR). Sticky, condenses on scroll.
2. **Hero** — headline (value prop) + tagline + subhead, a phone mockup/screenshot,
   and App Store + Google Play badges (placeholder badges until store listings exist).
3. **Problem → solution** — the pain (scattered measurements, missed due dates,
   notes everywhere) → SeamFlow in one place.
4. **Features grid** — icon + one-line + screenshot for each: Clients &
   measurements; Orders with status tracking; Group orders (weddings/aso-ebi);
   Design Studio moodboard + AI auto-describe; Due-date reminders; Bilingual
   (EN/FR); works offline.
5. **How it works** — 3 steps: add a client → create an order → get reminded.
6. **Vision / mission** — empowering independent tailors; more languages; the
   creative + business companion for the craft.
7. **Screenshot gallery** — a few app screens in phone frames.
8. **FAQ** — accordion: cost, languages, offline, "is my data private?" (links `/privacy`).
9. **Final CTA** — big "Download" with both store badges.
10. **Footer** — links to Privacy, Terms, Support, contact email, language toggle,
    copyright.

Build as reusable components under `apps/seamflow-web/components/` (e.g. `Nav`,
`Hero`, `FeatureCard`, `Steps`, `PhoneFrame`, `Faq`, `Footer`, `StoreBadges`,
`LangToggle`). Use **placeholder** logo + screenshots (a `/public/placeholders/`
folder) until the real brand assets land; make them trivial to swap.

#### D. i18n (EN/FR)

Match the app's two languages. Keep it lightweight (no heavy framework needed):
a `lib/i18n` with `en`/`fr` dictionaries and a `?lang=fr` query (or `[lang]`
segment) that the `LangToggle` switches. Every page (landing, privacy, terms)
renders in the requested language, English default.

#### E. Legal content

- **Privacy Policy** must cover, at minimum: what's collected (tailor account
  email/phone; client names, phone numbers, addresses, measurements, and photos
  **entered by the tailor**; design images; device push token; basic usage/logs),
  who processes it (Supabase for DB/auth/storage, Expo for push, Upstash for
  queues, Anthropic **only if** AI auto-describe is used), how it's stored/retained,
  user rights (access/export/delete), children, security, international transfer,
  contact email, and a "last updated" date + changes clause.
- **Terms** — standard short SaaS terms (acceptable use, no warranty, liability
  cap, governing law, contact).
- Draft copy will be provided as Markdown; the pages render it (MDX or a simple
  content module). Include a visible "Last updated" date.

#### F. In-app policy links (mobile, `apps/seamflow-app`)

- Add a **"Legal" section** to Settings (`app/(app)/me.tsx`) with **Privacy Policy**
  and **Terms** rows.
- Add a footer line on the **sign-in screen**: "By continuing, you agree to our
  Terms & Privacy Policy," with those two words tappable.
- Both open via **`expo-web-browser`** (already installed):
  `WebBrowser.openBrowserAsync(\`\${WEB_URL}/privacy?lang=\${language}\`)` — an
  in-app browser (SFSafariViewController / Chrome Custom Tabs). No native rebuild.
- `WEB_URL` comes from a new env var `EXPO_PUBLIC_WEB_URL` (default
  `https://www.seamflowtech.com`) in `lib/config.ts`; pass the current i18n `language`.
- All new strings go through `t()` (add to `lib/i18n/locales/settings.ts` +
  `auth`), and must pass `npm run i18n:check`.

#### G. Quality bar

Responsive (mobile-first — the audience is on phones), accessible (semantic
headings, alt text, keyboard-navigable FAQ), fast (optimized images, minimal JS),
and SEO-complete (per-page `metadata`, OG image, sitemap, robots). Lighthouse
pass before we consider deploy.

- **Tech:** `apps/seamflow-web` (Next.js 15, Tailwind), `next/font`,
  `expo-web-browser` (mobile). No new backend.
- **New env:** `EXPO_PUBLIC_WEB_URL` in the mobile app.
- **Explicitly deferred (do not do):** buying/pointing the domain, Vercel deploy,
  real store badges/links, final brand assets. Stop at a reviewable local build.
- **Dependencies:** brand assets (logo from `SeamFlow-Brand-Brief.docx`) are
  nice-to-have but not blocking — use placeholders.

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
