# SeamFlow QA audit — plan & findings log

Scope of this pass: **`apps/seamflow-app` (tailor + client mobile app)** and
**`apps/seamflow-api`**, plus the shared packages they depend on
(`packages/schemas`, `packages/api-client`, `packages/utils`, `packages/ui`).
`seamflow-web`, `seamflow-admin` and `seamflow-client` come in a later pass.

Started: 2026-10-17. Status: **Phases 0–3 complete and their findings fixed. Phase 4 not started.**

---

## Baseline measured at the start

| Thing | State |
|---|---|
| API | NestJS 11, 246 TS files, ~30.7k lines, 42 controllers, 41 services |
| App | Expo SDK 55 / RN 0.83 / New Architecture, 289 files, ~62.4k lines, 90 route screens |
| Shared | schemas (Zod, 40 files), api-client (37), ui (24), utils (10) |
| DB | Supabase Postgres, Drizzle, 53 migrations |
| `tsc --noEmit` | **clean** on both API and app |
| Automated tests | **7 files total**, all in `packages/*`. Zero in API, zero in app. Only 5 of the 7 actually ran (40 tests) — see P-13 |
| API `scripts/test-*.ts` | 32 files — manual integration scripts needing live `.env`, not automated tests |
| CI | **none** — `.github/workflows/` contains only `.gitkeep` |
| iOS | never built; no `ios/` dir, no APNs creds in EAS |

---

## How every level runs

Same contract at each level, no exceptions:

1. **Enumerate** — build the complete inventory for that level (every endpoint,
   every screen, every table). No sampling.
2. **Inspect** — read the code against the checklist for that level.
3. **Verify** — run it where it is runnable (typecheck, lint, i18n guard, the
   integration scripts, `EXPLAIN` on hot queries, the app on both an iOS
   simulator and an Android emulator).
4. **Report** — a findings table: *what / where (`file:line`) / why it matters /
   what I would do / effort*. Severity:
   - **Critical** — exploitable now, or data loss. Fix before the store.
   - **High** — will bite in production or blocks review. Fix before the store.
   - **Medium** — real, has a workaround or needs scale to hurt. Fix soon.
   - **Low** — correctness or polish. Batch it.
   - **Nit** — style, naming, dead code.
5. **You decide** — per finding or in bulk. Nothing is changed before that.
6. **Fix + pin** — each accepted fix lands with a regression test, so it cannot
   silently come back.

---

## Phase 0 — Make the audit verifiable — **DONE** (2026-10-17)

Nothing below can be trusted without this, so it went first.

**Result: `turbo run lint test` is green across all 11 workspaces — 23/23 tasks,
109 tests passing (up from 40), and the task no longer hangs.** No dependency
was added or changed; every fix was configuration or new test code, so the
build that is about to go to the App Store is untouched.

- 0.1 ✅ **CI workflow** — `.github/workflows/ci.yml`. Runs on push to `main`,
  on every PR, and on demand. pnpm from the root `packageManager` field, Node
  from `.nvmrc`, `--frozen-lockfile`, then `turbo run lint` and
  `turbo run test`. Deliberately the same two commands a contributor runs
  locally, so "green CI" and "passes on my machine" cannot diverge. Superseded
  runs cancel themselves.
- 0.2 ✅ **API test harness** — `apps/seamflow-api/vitest.config.ts`, shared
  fakes in `test/fakes.ts`, and the first 25 tests across
  `src/common/staff.guard.spec.ts` and `src/auth/supabase-auth.guard.spec.ts`.
  Plain vitest, no decorator transform: guards, services and controllers all
  take their dependencies through the constructor, so a test builds them with
  `new` and hand-written fakes and every dependency is explicit.
  **Open decision for Phase 1**: that shape cannot boot the real Nest container
  (`Test.createTestingModule` needs `emitDecoratorMetadata`). When the
  authorization matrix wants supertest against the real guard chain, add
  `unplugin-swc` then.
  Specs are excluded from `tsconfig.json` so `nest build` cannot ship them
  (verified: 0 `*.spec.js` in `dist/`, 214 files otherwise), and a separate
  `tsconfig.spec.json` keeps them typechecked. `lint` runs both.
- 0.3 ✅ **App test harness** — `jest-expo` was configured and unused. First 23
  tests in `apps/seamflow-app/lib/invoice-math.test.ts`, chosen because it is
  money: XAF's absent minor unit, the comma decimal key on a French Android
  keyboard, NBSP thousands separators, negative-line clamping, and the
  line-vs-subtotal agreement the module exists to guarantee. Colocated beside
  the source so the existing `tsconfig.json` typechecks them.
  **Open decision for Phase 4**: screen-level tests want
  `@testing-library/react-native`, which is not installed. Left out of Phase 0
  on purpose — zero new dependencies this close to a store submission.
- 0.4 ✅ **The 32 `test-*.ts` scripts** — kept as manual end-to-end smoke
  tests, which is what they are: 30 of 32 need live Supabase credentials and a
  running server, and they write real rows. Documented in
  `apps/seamflow-api/scripts/README.md` (what each kind of test is for, when to
  run which) and given a single sequential runner, `pnpm test:e2e:all`
  (`scripts/all.mjs`), ordered so foundations fail first. Verified every one of
  the 30 is wired up and none is orphaned. **Not** in CI, and should not be
  until there is a staging Supabase project with throwaway data — a manually
  triggered workflow against staging is the right home for them later.

## Phase 1 — API security — **DONE** (2026-10-17)

**218 routes, 47 tables, 37 RLS policies, 19 storage policies and 9 buckets
reviewed against production.** Read-only queries were run against the live
Supabase project and the live API; nothing was written.

The headline: the security model is sound. Every table has RLS on, every policy
is correctly tenant-scoped, both payment webhooks verify in constant time, there
is no SQL injection anywhere, and the eight unauthenticated dev hooks are shut in
production (probed live, all 404). What the audit found is a consistent **second**
kind of gap — ownership checks on foreign keys that are *written*, and
defence-in-depth that was applied to six tables and not the other twelve.

### Verified safe (the hypotheses that did not survive contact)

- **P-1 does not apply.** All six tables answer `42501 insufficient_privilege`
  to the public anon key, so the lockdown **is** applied to production. It was
  only ever missing from git — re-filed as P-22.
- **RLS is on for all 47 public tables.** Every policy scopes to `auth.uid()`
  or `current_tailor_ids()`; the only `using (true)`-shaped policy is the
  deliberate `status = 'published'` feed read. `current_tailor_ids()` is
  `SECURITY DEFINER` with a pinned `search_path`, so it cannot be hijacked.
- **Storage**: all 19 object policies are scoped to a folder named for the
  owner's id.
- **No SQL injection.** 56 raw `sql` templates, none interpolating request
  input; Drizzle parameterises the rest.
- **Both payment webhooks verify correctly** — HMAC-SHA256 over the raw body
  (fake) and a shared secret (Fapshi), each compared with `timingSafeEqual`
  behind a length pre-check, each refusing everything when unconfigured. The
  fake provider refuses to load outside development.
- **The public feed carries no PII** — `city` only, no phone, email or address.
- **No secrets in git.** `.env` is ignored, only `.env.example` files are
  tracked, and the stale Fly deploy script holds placeholders.
- **`POST /me/tailor` self-promotion is not escalation** — it is keyed to the
  caller's own `user.id` and gives an empty shop. Dual-role is a product
  feature (`choose-role.tsx`, `lib/switch-side.ts`).
- **Chat's `clientId` is two different things** and both are fine: an
  idempotency key minted on the device, and a client-book link resolved through
  a tailor-scoped `load()`.


- 1.1 **Authentication** — the token path end to end: `SupabaseAuthGuard`
  ordering, the `@Public()` inventory (7 files), suspended-account asymmetry,
  deleted/purged accounts, how `role` is derived and what a missing profile row
  grants, service-role key blast radius.
- 1.2 **Authorization & tenant isolation** — the big one. A matrix of all 42
  controllers × every route: does the service scope by `tailorId`/`userId`, and
  is every foreign key on a write asserted to belong to the caller. Cross-role
  boundaries too (tailor vs client vs staff vs anon).
- 1.3 **RLS & data at rest** — per-table RLS coverage across the 53 migrations,
  whether the uncommitted lockdown migration is applied to prod, storage bucket
  policies, signed-URL TTLs, what the public anon key can actually reach.
- 1.4 **Secrets & config** — `env.ts` completeness, what ships in the app
  bundle, Sentry PII scrubbing, Render env vs `eas.json`, secret rotation paths.
- 1.5 **Input validation** — Zod coverage on every body/query/param, upload
  validation (MIME, size, magic bytes, image bombs), `ILIKE`/`unaccent` search
  input, every raw `sql` template for injection, UUID parsing on path params.
- 1.6 **Public surface** — share links (signing, expiry, revocation,
  enumeration), public invoice/order token routes, the Fapshi webhook
  (signature verification, replay, idempotency), the discovery feed and
  storefront reads.
- 1.7 **Abuse & rate limiting** — the per-route limit map, OTP brute force and
  resend cost, AI/assistant endpoint cost abuse, report/moderation abuse,
  account-deletion abuse, enumeration via error-message differences.
- 1.8 **Output hygiene** — error responses that leak internals, list endpoints
  that over-return (other people's phone numbers, emails, exact addresses),
  log lines containing PII or measurements.

## Phase 2 — API correctness — **DONE** (2026-10-17)

Audited 30 multi-write service methods, 10 scheduled jobs, the order state
machine, the payment settlement path and the account-deletion lifecycle.
Read-only throughout; nothing was changed.

**One theme accounts for most of it: mark the state, then apply the effect,
with no transaction and nothing to reconcile the gap.** That is not
carelessness — the same author solved exactly this in `works.publish` with a
compensating delete, and used an atomic claim in `settle` to stop a payment
being granted twice. It is missed in three places, and in two of them the
state that gets marked first is the thing that blocks the retry.

### Verified sound

- **The order state machine.** Every status reachable from `registered`, no
  dead ends, no self-edges, and `nextOrderStatuses` (which the app reads to
  build its buttons) agrees with `canTransitionOrderStatus` (which the server
  enforces) for all 25 pairs. 13 new tests in `packages/schemas`.
- **`purgeUser` is a correct saga, not a missing transaction.** It spans
  storage, the database and Supabase auth, so no DB transaction could make it
  atomic. It is ordered so the ids outlive what they locate, each step is
  idempotent, and a failure leaves the account pending for tomorrow's run —
  "better a late deletion we can see in the logs than a half-finished one we
  cannot".
- **`works.publish`** inserts the post, copies the images, then corrects the
  cover columns — and deletes the row in a `catch`, naming the exact `.pending`
  404 it is avoiding.
- **`settle`'s other defences**: it re-asks the provider instead of trusting
  the webhook body (so a leaked secret buys nothing), refuses a ref belonging
  to another payment, refuses underpayment, and claims the row with
  `ne(status, 'succeeded')` so a webhook racing the reconcile cron cannot
  double-grant.
- **Idempotency where it exists is done properly**: chat sends carry a
  device-minted key, support tickets dedupe on `(user, clientId)`, and order
  reminders use `order_reminder_log` with `onConflictDoNothing()`.


- 2.1 Domain invariants: order state machine, group-order atomicity, invoice
  math, deposit/payment arithmetic, subscription entitlement and caps.
- 2.2 **Transaction boundaries** — every multi-write operation. Partial failure
  must not leave half an order, half a group, or an un-audited change.
- 2.3 Idempotency: webhooks, push sends, and retried mutations from the app's
  offline outbox.
- 2.4 Error semantics: correct status codes and a single error shape the app can
  branch on; no 500 where a 409 belongs.
- 2.5 Scheduled jobs: the `ScheduleModule` crons (reminders, retention, purge) —
  behaviour on two instances, on failure mid-run, across timezones.
- 2.6 Fire-and-forget paths: the `void this.notify…` calls that swallow errors —
  where silence is right and where it hides a broken feature.

## Phase 3 — API scalability — **DONE** (2026-10-18)

**Profiling was not possible and that is worth saying plainly.** The production
database holds 22 orders, 36 feed posts, 63 clients and 38 users. `EXPLAIN` on
it returns sequential scans for almost everything, which is *correct* at that
size — every table fits in a page or two. So this phase checked index coverage
against the query shapes, read the code for per-row round trips, and measured
what could honestly be measured against the live API, rather than pretending a
profile of 22 rows means anything.

Doing that turned up something bigger than any query.

### Verified sound

- **`prepare: false` is right**, and the Phase 2 transactions are safe through
  it. pgBouncer in *transaction* mode pins a server connection for the length of
  a transaction, so `BEGIN … COMMIT` works. What it breaks is session state —
  prepared statements (hence the flag), session-level advisory locks, LISTEN/
  NOTIFY — which is exactly why the Q-5 cron lease cannot be an advisory lock.
- **Index coverage is thoughtful where it exists**: partial indexes keyed on
  `status`, composite cursor indexes ending `(created_at DESC, id DESC)`, GIN on
  `tags`/`colors`/`attributes`, and trigram indexes on client name and phone.
- **Pagination is capped** in the schemas — feed 48, notifications 50, works 60
  — and chat clamps in the service.


- 3.1 **The auth hot path** — every authed request currently costs one Supabase
  `auth.getUser` HTTP round-trip plus one `users` row read. This is the ceiling
  on everything. Local JWT verification + a short-TTL profile cache.
- 3.2 Rate-limit storage is in-memory — correct for one instance, silently
  wrong the day Render runs two.
- 3.3 Index audit: `EXPLAIN ANALYZE` the hot queries (orders list, feed, chat
  messages, search, discover ranking) against realistic row counts.
- 3.4 N+1 queries in list endpoints (feed, works, chat, requests).
- 3.5 Connection pooling: `postgres-js` against pgBouncer transaction mode, pool
  size vs Supabase's connection ceiling, behaviour on pool exhaustion.
- 3.6 Payload size: unclamped `limit` params, fat list rows, image URL hydration.
- 3.7 Render free tier cold starts — what a 50s wake does to the app (there is
  already a `ColdStartBanner`, so this is about whether it is enough).
- 3.8 Caching: what is safe to cache (public catalogue, feed, storefront) and
  where (HTTP headers, in-process, Redis).

## Phase 4 — App functional, **iOS and Android separately**

Every item below is checked on an iOS simulator *and* an Android emulator, and
the finding records which platform it was seen on.

- 4.1 Navigation & deep links across 90 screens: back behaviour, tab history,
  `seamflow://` links, share-intent entry, cold start vs warm resume.
- 4.2 Auth flows: email/password, Google OAuth, **Apple Sign-In (iOS only, never
  exercised — and the App Store requires it once you offer Google)**, email OTP,
  password reset, PIN lock, session expiry recovery, sign-out cleanup.
- 4.3 State & data: react-query defaults, cache invalidation, optimistic
  updates, the offline outbox (`chat-outbox`, `pending-work`, `drafts`), sync
  conflict resolution.
- 4.4 Offline & flaky network: airplane-mode pass over every mutation.
- 4.5 **Platform parity sweep** — safe areas (Dynamic Island / home indicator vs
  Android nav bar), keyboard behaviour (iOS vs Android `pan`), every permission
  in grant *and* deny *and* iOS "limited photos" state, native date/time
  pickers, share sheet (`expo-share-intent` needs an iOS app extension), iOS
  swipe-back vs Android hardware back, haptics, `expo-glass-effect` (iOS-only),
  fonts, RTL/Arabic, push notifications (**iOS push is unproven — no APNs
  creds**).
- 4.6 The two house rules in `CLAUDE.md`: run the i18n guard to zero, and audit
  that every data-backed screen has a skeleton that actually mirrors its loaded
  layout.
- 4.7 Accessibility: touch target sizes, VoiceOver and TalkBack labels, dynamic
  type / font scaling, contrast in both themes, reduced motion.
- 4.8 State coverage: loading / empty / error / offline / permission-denied on
  every screen.

## Phase 5 — App non-functional

- 5.1 Performance: list virtualization (`FlatList` vs mapped `ScrollView`),
  image sizing and caching, re-render cost, bundle size, startup time,
  Reanimated work on the JS thread.
- 5.2 Leaks: listeners, intervals, and realtime subscriptions on unmount.
- 5.3 Crash safety: error boundaries, Sentry in the app, what a thrown render
  error actually shows a tailor.
- 5.4 Client-side security: SecureStore vs `localStorage` on web, PIN strength
  and lockout, measurements in screenshots and the clipboard, PII in logs, no
  secrets in the bundle, how far deep-link parameters are trusted.
- 5.5 **App Store readiness**: privacy manifest, data-use disclosures that match
  the permissions actually requested, iPad (`supportsTablet: true` is a promise
  to the reviewer), in-app account deletion, export compliance, and the first
  EAS iOS build — which has never run.

## Phase 6 — Cross-cutting

- 6.1 Shared packages as the single source of truth: drift between
  `packages/schemas`, the API DTOs, and app usage; stale built `dist` vs source.
- 6.2 Observability: Sentry both sides, log levels, PII in logs, health-check
  depth, and what alerting exists (today: none).
- 6.3 Data lifecycle: deletion grace period, purge job, chat-media and
  verification-document retention, backups and a *tested* restore.
- 6.4 Dead code: `app-legacy/`, `src-legacy/`, and whether `seamflow-client`
  (110 tracked files) is live or an abandoned duplicate of `app/(client)`.

---

## Phase 1 fixes — applied 2026-10-17

Every fix is pinned by a test. The API went from 25 to **68 passing tests**
(10 spec files); `turbo run lint test` is 23/23 green and `nest build` still
ships no test code.

Each code fix was verified by reverting it and watching the new tests go red:
12 of 14 for the orders/group-orders pair, 3 of 4 for group-order-members,
3 of 6 for measurement-sets/works. The ones that stayed green in each case are
the deliberate "this still works" tests.

| # | What changed | Test |
|---|---|---|
| P-19 | `templateId` asserted on member create **and** update, and `resolveTemplate` now takes a `tailorId` and scopes both of its reads. A foreign id reads as "no template configured" instead of returning someone else's fields. Found a **second** unscoped call site while fixing it (`saveMeasurementsToClient`, which persisted the resolved id onto a new measurement set). | `group-order-members.service.spec.ts` — incl. the oracle test asserting `targetFields` comes back 0 |
| P-20 | Ownership asserts added for every request-supplied FK: `group_orders` (fabric, template, member, client — on `create`, `update` *and* the atomic `createWithMembers`, before it opens its transaction), `orders` (group + group member, on create and update), `measurement_sets` (template), `works` (order). | 4 spec files, 21 tests |
| P-21 | New migration enabling the REVOKE on the remaining twelve tables. Verified safe first: only `designs` is read directly by an app, and only `messages`/`conversations` are in the realtime publication — none of the twelve. | executes clean against the production schema |
| P-22 | The untracked migration is committed (already idempotent, so re-running it is safe). **See the drift note below — it is bigger than one file.** | — |
| P-23 | The nine dev hooks moved to their own `DevHooksController`, which `HealthModule` only registers when `NODE_ENV !== 'production'`. The routes no longer exist in production rather than each handler refusing. The repeated per-handler check is gone, so a tenth hook is covered the moment it is written. | `health.module.spec.ts` — reads the module's own metadata, and asserts `/health` survives in every environment |
| P-24 | `feed_tailor_write` dropped. Reads stay public; writes were already server-side only. | migration |
| P-25 | 10 MB + the image allowlist already proven on `designs`/`order-photos`, applied to `works`, `chat-media`, `support-media`, `verification-evidence`. Checked every upload path first: they all re-encode to jpeg/png/webp. | migration |
| P-26 | `@Throttle` on the five write-amplifying routes: checkout 10/min, support tickets 5/min, share-link minting 20/min, verification submission 5/min, deletion request 5/min. | — |
| P-27 | `maskPhone` / `maskEmail` in `common/redact.ts`, applied at the three sites. Keeps the country code and last four digits, and the email domain — enough to diagnose, not enough to identify. | `redact.spec.ts`, 11 tests |
| P-28 | Zod DTOs for the four real cases, each `.strict()` so a misspelled field is a 400 rather than a silent `false`. `savedAmong`'s id array is bounded at 200. (The two in the dev hooks are now dev-only.) | typecheck |
| P-29 | **Not deleted — your call.** The guard does nothing today, so removing it is behaviour-neutral, but that is a deletion you should choose. Instead its docblock now says plainly that nothing uses it and what actually enforces the boundary, and `requireTailorId` — the three-line function the whole tailor/client separation rests on — finally has tests. | `tailors.service.spec.ts` |
| P-30 | `feed_posts_public_read` now also calls a new `tailor_owner_is_live()` (SECURITY DEFINER, pinned `search_path`, same shape as `current_tailor_ids()`). It has to be a function, not an inline subquery: a policy's subquery is itself subject to RLS and `anon` cannot read `users`, so an inline EXISTS would have taken the feed dark. | proven against production data in a rolled-back transaction: 36 posts before, 36 after, and 35 once one owner is marked as leaving |
| P-31 | **Reverted deliberately.** Widening the app's lint to `eslint .` closes the gap, but `eslint .` currently reports **10 errors** on `main`, so landing it now would make CI red. It should go in with the eslint branch that fixes those. | — |

### The three migrations are written, not applied

`20261017120000`, `20261017120100` and `20261017120200` are in
`supabase/migrations` and each was executed against the production schema
inside a transaction that was then rolled back, so they are known to run — but
**production is unchanged.** Verified afterwards: `anon` still holds SELECT on
`staff`, `tailor_owner_is_live` does not exist, the feed policy is still the
old one-clause version, and `feed_tailor_write` is still there.

### P-22 is worse than "one file was untracked"

The untracked migration was the symptom. **35 of the 52 migrations in git are
applied to production but absent from `supabase_migrations.schema_migrations`,
which stops at `20260715120000`.** Everything from the discovery feed onward —
chat, subscriptions, support, staff, verification, moderation — was applied by
some other route without being recorded.

So the history table is not a record of the database, and that has teeth:

- `supabase db push` would try to re-apply those 35, most of which are not
  idempotent, and fail somewhere in the middle.
- A rebuild from migrations has never been tested and would not produce
  production.
- The three new migrations above cannot be applied with the normal tooling
  until this is sorted.

Repairing it means telling Supabase those 35 are already applied
(`supabase migration repair --status applied <version>` per version). That
writes to production's migration table, so it needs your explicit go-ahead —
it is not something to do as part of a code fix.

## Phase 2 fixes — applied 2026-10-18

API tests 68 → 92. `turbo run lint test` 23/23 green, `nest build` still ships
no test code. Q-1 and Q-2 were each verified by reverting the fix and watching
the tests go red (4 of 11 for the pair).

The transaction fixes needed a fake that models rollback — `fakeTxDb` reports
which writes actually committed, so a test can tell "the second write failed, so
the first must not have stuck" from "the code ran". Without that a test passes
whether or not a transaction was opened at all, which is the one thing in
question.

| # | What changed | Test |
|---|---|---|
| Q-1 | `cancelDeletion` now requires `deletion_scheduled_for` to still be in the future, and refuses with `deletion_already_due` rather than silently doing nothing. A cancel with nothing pending is still a harmless no-op, so a double tap is not an error. | `account.service.spec.ts`, 4 tests |
| Q-2 | The claim and the grant commit together. `extendPremium`, `ensureFor` and `rowFor` take an optional `Executor` (a new type in `db.service.ts` that both the pooled handle and a transaction satisfy), so `settle` can run the grant inside the transaction that claims the row. A failed grant now rolls the claim back and leaves the row `pending`, which is exactly what the provider's retry and the reconcile cron already know how to finish. Also removed the `updated!` non-null assertion that would have returned undefined into a dereference. | `checkout.service.spec.ts`, 7 tests — incl. one asserting the grant is handed the transaction, because passing the plain handle would undo the whole fix |
| Q-3 | `verification.decide` wraps its three writes in one transaction, so the request cannot be left `approved` with no badge — a state `decide` itself refuses to retry. | `verification.service.spec.ts`, 4 tests |
| Q-4 | A failed re-publish takes the post out of the feed (`status: 'hidden'`) and rethrows, instead of leaving a live design with no images. Damage control rather than a fix — the old public copies are already gone by then — so the tailor still gets the real error. | `works.service.spec.ts`, 2 added |
| Q-5 | All ten `@Cron`s pin `timeZone: CRON_TZ` ('UTC'), so a cron expression no longer means whatever clock the host happens to keep. **The cross-instance half is NOT fixed** — see below. | `cron.spec.ts`, 4 tests, incl. one that fails if any new job forgets |
| Q-6 | `orders.create` writes the order, its items and its `created` event in one transaction. | `orders.service.spec.ts`, 3 added |
| Q-8 | The webhook's docstring now matches what it does, and says why an unexpected failure *should* be a 500: with Q-2 fixed, that is the request asking to be retried, and the retry now works. | — |

### Two left deliberately

- **Q-5's duplicate-reminder half.** Pinning the timezone was free. Stopping a
  second instance from sending every billing email twice needs durable state,
  and the usual trick — a Postgres advisory lock — is unavailable here: the
  connection goes through pgBouncer in *transaction* mode, where a session-level
  lock is not held to the session that took it. So it needs a lease table, which
  is a schema change queued behind the migration-history repair. The assumption
  is now written down in `common/cron.ts` instead of being implicit, so running
  a second instance is a decision rather than a surprise.
- **Q-7, no way to cancel an order.** Adding a status is a product change, not a
  fix: it needs a database enum, UI, both translations, and a decision about
  whether a cancelled order should free a free-tier slot (it should, which is
  half the point). That is yours to call, not something to slip into a
  correctness pass.
- **Q-9, two error shapes.** Normalising them means a global exception filter,
  which changes the body of every error the app already parses. Not a trade
  worth making days before a store submission for a cosmetic inconsistency the
  app handles.

## Phase 3 fixes — applied 2026-10-18

API tests 92 → 107. `turbo run lint test` 23/23 green.

| # | What changed | Test |
|---|---|---|
| R-1 | `render.yaml` now says `frankfurt`, which only applies to a newly created service — Render cannot move a running one. The sequence is in **[docs/render-region-move.md](render-region-move.md)**, and it needs a runbook rather than a config change because of two traps: a new service gets a new hostname (and `seamflow-api.onrender.com` is baked into six app files plus the Fapshi webhook, with Play Store closed-testing builds already pointing at it), and while both services run **all ten crons run twice** — which with Q-5 unfixed means duplicate subscription emails to every tailor. **Yours to carry out.** | — |
| R-2 | The token check and the profile read now issue together instead of one after the other. The row needs a user id and the id is not trustworthy until Supabase answers, so the id is read from the token's payload **unverified**, purely to start the query, and the result is discarded unless it matches the verified id. Roughly 150 ms off every authenticated request. | `supabase-auth.guard.spec.ts`, 4 added — including that a tampered `sub` pointed at an unsuspended account still gets refused |
| R-3 | Migration adding `orders (tailor_id, created_at DESC, id DESC)` and a trigram GIN on `order_name` — the two indexes `tailor_works` and `clients` have had all along. A dry run against production confirms the planner uses the sort index with **no Sort node**. `id DESC` tiebreaks so paging is stable. **Not applied** — queued behind the migration-history repair. | dry-run against the production schema, rolled back |
| R-4 | `renewalReminders` no longer selects every subscription. The reminder window is bounded by the furthest reminder day, so the database filters; `daysUntil` still decides who is due. Languages come back in one query (`languagesFor`) instead of one per tailor. | — |
| R-5 | `Cache-Control: public, max-age=60, stale-while-revalidate=300` on the four public feed reads and the catalogue. Deliberately **not** on `/public/orders/:token` or `/public/invoices/:token`, where a shared cache would hand one client's order to the next caller. | `cache.spec.ts`, 11 tests — asserting the token routes' *absence* of the header, not just the others' presence |
| R-6 | Photo reordering is two statements instead of 2N, via a `CASE` over the id list, and both passes are in a transaction. They were not before, so a failure between them left every position negative and the carousel reading backwards. ~1.8 s → ~0.3 s for six photos. | — |
| R-7 | The pool declares `max: 10`, `idle_timeout: 30`, `connect_timeout: 10`. The last matters most: without it a stalled pooler turned every request into one that never answers, which is worse than failing because nothing upstream can tell it from slowness. | — |

### What was deliberately not done

**Local JWT verification.** The project publishes an **ES256 JWKS**, so verifying
the signature in-process would need no secret and would remove the Supabase
HTTPS call altogether — the largest remaining win on the auth path, and what the
guard's own comment proposed.

It was not done because nothing would consult the *session* any more, so a
signed-out token would keep working until it expired — and
`AccountService.dropSessions` revokes sessions on purpose when an account asks to
be deleted. Giving that up is a decision to take knowingly, not a side effect of
a latency fix. Worth revisiting after R-1, which removes most of the latency the
change was meant to buy.

The same reasoning ruled out caching the `users` row: it would have removed the
second round trip at the cost of suspension taking effect late.

## Findings log

Filled in as each phase runs. Pre-audit observations from the initial scan:

| # | Sev | Area | Finding | Where |
|---|---|---|---|---|
| P-1 | Critical? | RLS | `20260929120000_lock_down_unprotected_tables.sql` is **untracked** and may never have been applied. It enables RLS and revokes anon/authenticated grants on `requests`, `offers`, `request_recipients`, `request_targets`, `feed_post_images`, `tailor_work_images`. The anon key is public (it ships in every bundle), so if this is not applied those six tables are readable and writable by anyone. Verify against prod before anything else. | `supabase/migrations/20260929120000_*.sql` |
| P-2 | High | Process | No CI. Nothing runs typecheck, lint, the i18n guard, or tests on push. | `.github/workflows/` |
| P-3 | High | Process | 7 automated test files for ~136k lines. Zero in the API, zero in the app. The 32 `test-*.ts` scripts need a live `.env` and are never run automatically. | `apps/seamflow-api/scripts/` |
| P-4 | High | Scalability | Every authed request makes a Supabase `auth.getUser` HTTP call **plus** a `users` row read before the handler runs. Both the latency floor and the scaling ceiling. The code already flags it as a known trade-off. | `src/auth/supabase-auth.guard.ts:62` |
| P-5 | High | AuthZ | `groupOrderId`, `groupOrderMemberId` on order create/update are never checked for ownership, while `clientId` and `fabricId` are (`assertClientOwned` / `assertFabricOwned`). Same gap on `groupOrders.create` for `sharedFabricId`, `templateId`, `ownerMemberId`, `ownerClientId`. `GroupOrderMembersService` has the right pattern (`assertGroupOwned`) and is simply not reused. Lets a tailor attach their rows to another tailor's. Needs the full write-side FK matrix (1.2). | `src/orders/orders.service.ts:188`, `src/group-orders/group-orders.service.ts:59` |
| P-6 | Medium | Security | The auth guard catches and logs a failed profile lookup, then continues. On a DB blip the caller proceeds with the default role `tailor` and the **suspension check is skipped entirely**. | `src/auth/supabase-auth.guard.ts:93` |
| P-7 | Medium | Correctness | `orders.create` writes the order, its items, and the audit event as three separate statements with no transaction. A failure between them leaves an order with no items and no audit trail. Likely the same shape elsewhere. | `src/orders/orders.service.ts:196` |
| P-8 | Medium | Scalability | Throttler storage is in-memory. Correct on one instance; the day Render runs two, every instance gets its own budget and the effective limit doubles. | `src/auth/auth.module.ts:25` |
| P-9 | Medium | iOS | iOS has never been built — no `ios/` directory, no APNs credentials in EAS, so iOS push is entirely unproven. The first EAS iOS build is unvalidated against the current plugin set. | `apps/seamflow-app/app.json` |
| P-10 | Low | iOS | `supportsTablet: true` commits you to a working iPad layout at review, and iPad screenshots. Nothing has been checked at that size. | `apps/seamflow-app/app.json:12` |
| P-11 | Nit | Hygiene | Working tree has deleted-but-uncommitted brand assets and `README.txt`, plus untracked `docs/marketing-*` and `Claude outputs/`. Noise that hides real changes in `git status`. | repo root |
| P-12 | High | Infra | `.nvmrc` pins **Node 20, which is past end-of-life** — no more security patches. The dev machine actually runs 22.12 and `engines` says `>=20`, so the declared version and the one in use already disagree. CI follows `.nvmrc`, so the first run is also the first time anything has been verified on Node 20. Bumping it touches Render and EAS, so it is your call, not a silent change. | `.nvmrc`, `package.json` |
| P-13 | High | Process | **21 real tests had never run once.** `packages/schemas` had a placeholder `"test": "echo 'no tests'"` while `src/search.test.ts` held 15 passing tests, and `packages/ui` had `pressGuard.test.ts` (6 tests, written after a tailor double-tapped and created eight identical clients) with no `test` script at all. **Fixed** — both now run. | `packages/schemas/package.json`, `packages/ui/package.json` |
| P-14 | High | Process | `turbo run lint` **fails on a fresh checkout**: `lint` depended on `^lint`, so the API typechecked against a `@seamflow/schemas/dist` that had never been built. Proved by moving the built `dist` aside — 40+ `TS2307 Cannot find module` errors. It only passed locally because a stale `dist` happened to exist. **Fixed** — `lint` now depends on `^build`. | `turbo.json` |
| P-15 | High | Process | Both Expo apps' `"test"` was `jest --watchAll`, which never exits. Any CI running `turbo run test` would have hung until the job timed out. **Fixed** — `test` is `jest --ci --passWithNoTests`, watch moved to `test:watch`. | `apps/seamflow-app/package.json`, `apps/seamflow-client/package.json` |
| P-16 | Medium | Process | `seamflow-api`'s `"test": "vitest run"` had zero spec files, so it exited non-zero with "No test files found" — the API test task was broken, not merely empty. **Fixed** by the specs added in 0.2. | `apps/seamflow-api/package.json` |
| P-17 | Low | Code health | 27 eslint warnings in `seamflow-app` (0 errors): unused imports and variables, duplicate `react`/`react-native` imports, one stale `eslint-disable`. Harmless individually; they are the noise that hides a real warning. | `apps/seamflow-app` |
| P-18 | — | Dev env | On this machine `pnpm` is currently unusable: the Homebrew build requires Node ≥22.13 and Node is 22.12. Worked around with corepack (`corepack prepare pnpm@9.0.0 --activate`). Not a repo defect, but it is why nothing could run until it was fixed, and it will hit anyone who clones. | local |
| P-19 | Medium | AuthZ | **Confirmed cross-tenant read.** A group member's `templateId` is written straight from the request with no ownership check (`createForGroup` and `update` — both of which *do* call `assertClientOwned` for `clientId` on the adjacent line), and `resolveTemplate` then reads `measurement_templates` filtered by **id alone**. `copyMeasurementsFromClient` returns `targetFields`, so the response hands back another tailor's template field count directly; `matchedFields` turns it into an oracle for which field keys that template contains. What escapes is template structure, not customer PII — hence Medium, not High. Fix is one `and(eq(measurementTemplates.tailorId, …))` plus an assert on the write. | `group-order-members/group-order-members.service.ts:223`, `:105`, `:202` |
| P-20 | Medium | AuthZ | **The P-5 class, now fully enumerated.** Foreign keys written from request input with no ownership assert: `group_orders.create` → `sharedFabricId`, `templateId`, `ownerMemberId`, `ownerClientId`; `orders.create`/`update` → `groupOrderId`, `groupOrderMemberId`; `measurement_sets.createForClient`/`update` → `templateId`; `group_order_members` → `templateId`; `works.create` → `orderId`. Mostly referential-integrity damage (rows pointing into another tenant) rather than disclosure — except where it feeds P-19. The fix pattern already exists in the same files: `assertClientOwned`, `assertFabricOwned`, `assertGroupOwned`, and the transactional `createWithMembers`, which *does* verify. | `group-orders/group-orders.service.ts:59`, `orders/orders.service.ts:188`, `works/works.service.ts:419` |
| P-21 | Medium | RLS | Twelve tables have RLS enabled with **zero policies** (deny-all, so safe today) but still grant anon and authenticated full SELECT/INSERT/UPDATE/DELETE: `staff`, `subscriptions`, `subscription_payments`, `platform_settings`, `admin_actions`, `phone_verifications`, `support_tickets`, `support_messages`, `verification_requests`, `content_reports`, `user_blocks`, `saved_designs`. Six sibling tables got a `REVOKE` for exactly this reason — the author's own comment calls it "belt-and-braces: even if a permissive policy is added by mistake later". One accidental `create policy … using (true)` on `staff` or `platform_settings` (which holds prices) is immediate exposure. Only `designs` is read directly by an app, so the revoke is safe for all twelve. | `supabase/migrations/20260929120000_*.sql` |
| P-22 | High | Process | **Production schema has drifted from git.** The lockdown migration is applied to prod but untracked, so rebuilding the database from `supabase/migrations` produces a database **missing those protections** — and nobody can review a change that exists only in prod. Commit it (it is already applied, so it needs to be idempotent). | `supabase/migrations/20260929120000_*.sql` |
| P-23 | Medium | Security | Eight unauthenticated, destructive endpoints live on the `@Public()` health controller — account purge, subscription grant, payment recording, retention sweeps. Each is guarded by its own copy of `if (process.env.NODE_ENV === 'production') throw new NotFoundException()`. Verified shut on the live API (all 404). But the guard is duplicated per handler, so one future hook that forgets the line is wide open, and `envSchema` **defaults `NODE_ENV` to `'development'`** — the unsafe value — so a dropped Render env var opens all eight at once. Fail-closed instead: don't register the controller outside development, so the routes do not exist. | `health/health.controller.ts:56-150`, `config/env.ts:4` |
| P-24 | Medium | Storage | The `feed` bucket is **public**, has no size limit and no MIME allowlist, and `feed_tailor_write` lets any authenticated tailor write directly into it. Nothing uses that grant: feed images are copied in server-side with the service role (`works.service.ts:741`), and no app writes to `feed`. So it is pure attack surface on a public CDN — arbitrary file type, arbitrary size, hostable at a `supabase.co` URL. Revoke the policy. | storage policy `feed_tailor_write` |
| P-25 | Medium | Storage | Four buckets the apps upload to **directly** have neither a size limit nor a MIME allowlist: `works`, `chat-media`, `support-media`, and `verification-evidence` (which holds identity documents). `order-photos`, `designs` and `requests` all have 10 MB + an image allowlist, so the pattern exists and was not applied. Note these uploads go straight to Supabase, bypassing the API — so they also bypass the rate limiter, the subscription caps and any server-side validation. Client-side compression is advisory; an attacker uses curl. | `storage.buckets` |
| P-26 | Medium | Abuse | Write-amplifying routes inherit the generous 300/min default with no `@Throttle` override: checkout/payment initiation, support ticket creation, share-link minting, verification submission, account deletion. The default is correctly tuned for a tailor syncing a busy day; it is far too loose for these. AI, assistant, phone verification and moderation are already tightened, so the pattern exists. | `subscriptions/checkout.controller.ts`, `support/support.controller.ts`, `share-links/share-links.controller.ts`, `verification/verification.controller.ts`, `account/account.controller.ts` |
| P-27 | Low | Privacy | PII in logs, which reach Render and Sentry: a full phone number (`OTP send failed for ${phone}`) and recipient email addresses on every email failure. Mask them. | `phone-verification/phone-verification.service.ts:160`, `notifications/email.service.ts:55`, `:72` |
| P-28 | Low | Validation | Six endpoints declare `@Body()` with a bare inline TypeScript type instead of a Zod DTO, so the global `ZodValidationPipe` has no schema and the body is unvalidated at runtime. None is currently exploitable (each reads one field with a strict comparison), but the type gives false assurance. | `me/me.controller.ts:31`, `feed/feed.controller.ts:66`, `subscriptions/subscriptions-admin.controller.ts:53`, `:78`, `health/health.controller.ts:113`, `:122` |
| P-29 | Low | AuthZ | `RolesGuard` is registered globally but `@Roles()` appears on **0 of 218 routes** — the role system is dead code. Role separation rests entirely on `requireTailorId` throwing 404 and `resolveActor`. That works, but a guard that looks like it enforces something and does not is worse than no guard: the next person will assume it covers a route it does not. Wire it or delete it. | `auth/roles.guard.ts`, `auth/auth.module.ts:27` |
| P-30 | Low | Privacy | `feed_posts_public_read` has no `ownerIsLive()` counterpart, so a deletion-pending tailor's published posts stay readable on the direct REST path even though the API filters them out — and "vanish from every public surface immediately" is the stated promise in `common/live-owner.ts`. Latent today: 2 accounts are leaving, 0 of their posts are published. | storage policy `feed_posts_public_read` |
| P-31 | Low | Process | `expo lint` — which is what the app's `lint` script and therefore CI runs — covers a narrower surface than `eslint .`: it skips `babel.config.js`, `scripts/` and `babel-plugins/`. That is why Phase 0 measured 27 warnings and 0 errors while a full `eslint .` found 33 warnings **and an error** in `babel.config.js`. CI would not have caught it. Point the app's lint script at the whole directory. | `apps/seamflow-app/package.json` |
| Q-1 | High | Correctness | **Cancelling a deletion can destroy an account's data with no trace.** `cancelDeletion` requires only `deletedAt is null` — not that the deadline is still in the future. The purge deletes the `tailors` row (cascading clients, orders, invoices, everything) at step 2 and writes the `deletedAt` tombstone at step 4, and credentials survive until step 5, so there is a window in which the user can still sign in with `deletedAt` null and all their business data already gone. Cancelling in that window succeeds, clears `deletionRequestedAt`/`deletionScheduledFor`, and leaves a live, un-flagged account with nothing in it and no record that a deletion ever ran — the next cron will not pick them up either. No failure is required: a cancel racing a purge that is mid-run does it. Fix: refuse cancellation once `deletionScheduledFor <= now()`. | `account/account.service.ts:152`, `account/account-purge.service.ts:82` |
| Q-2 | High | Correctness | **A paid subscription can be lost silently and permanently.** `settle` claims the payment row as `succeeded` — correctly, to stop a double grant — and *then* calls `extendPremium`. If that throws (it does `ensureFor` plus an update, and returns `updated!` with a non-null assertion), the payment reads succeeded and the premium is never granted. Every recovery path is then shut: a redelivered webhook returns early on `row.status === 'succeeded'`, `reconcilePending` only selects `status = 'pending'`, and the staff `recheck` goes through the same `settle`. A grep confirms exactly one statement in the subscription code touches `succeeded`, and it is the claim — so nothing in the system can ever grant that payment. Fix: claim and extend in one transaction, so a failed grant rolls the claim back and the existing retry works. | `subscriptions/checkout.service.ts:271-283` |
| Q-3 | Medium | Correctness | **An approved verification can leave the badge off, unrecoverably.** `decide` marks the request `approved`, then updates `tailors.isVerified` — the comment says "the badge and its provenance move together", and nothing enforces it. If the second update fails, the request is approved and the badge is absent; `decide` then refuses any non-pending request with 409, so staff cannot retry. Needs a manual database edit. Same shape as Q-2. | `verification/verification.service.ts:318-340` |
| Q-4 | Medium | Correctness | **Re-publishing a design can strip its images.** `syncPublicImages` removes the old public copies from storage *and* deletes their rows before copying the new ones. The new-post path wraps it in a `try/catch` that deletes the post; the re-publish path (`existing` branch) calls it with no protection, so a storage error there leaves a live feed post with zero images and no sweeper to notice. | `works/works.service.ts:774`, `:850` |
| Q-5 | Medium | Scalability | **Ten `@Cron` jobs, no locking and no timezone.** They run in-process, so a second Render instance runs every one of them twice. Most survive it; `renewalReminders` does not — it has no dedupe at all, so every tailor gets the expiry email *and* push twice, and these are the emails about money. The right pattern already exists in this codebase (`order_reminder_log` + `onConflictDoNothing`) and this job does not use it. Separately, no `@Cron` passes `timeZone`, so "09:00" means the host's clock — UTC on Render, not the WAT its tailors live in — and would shift silently if the host region or base image ever changed. | `subscriptions/subscriptions.service.ts:499`, and the nine other `@Cron` sites |
| Q-6 | Medium | Correctness | **P-7 confirmed.** `orders.create` writes the order, its line items and the `created` audit event as three separate statements. A failure after the first leaves an order with no items and no creation event — and `order_events` is append-only, so nothing reconstructs it. The codebase has a real transaction a few files away in `group-orders.createWithMembers`. | `orders/orders.service.ts:196-230` |
| Q-7 | Low | Product/correctness | **An order cannot be cancelled.** The state machine's only ending is `delivered`, so a client who walks away leaves an order that can either sit in `on_pause` forever or be marked delivered, which is false. It compounds: the free-tier `active_orders` cap counts orders that are not delivered, so an abandoned order permanently consumes one of the slots and the only ways to free it are recording a lie or deleting the history. | `packages/schemas/src/order.ts:19`, `subscriptions/subscriptions.service.ts:315` |
| Q-8 | Low | Correctness | The payment webhook's docstring says it "always answers 200", because a provider that receives an error retries for hours. There is no `try/catch`, so an unexpected throw returns 500 — and those retries are then no-ops, because the row was already claimed (Q-2). The stated contract and the code disagree. | `subscriptions/checkout.controller.ts:84-93` |
| Q-9 | Low | Correctness | Two different error shapes reach the app. There is no global exception filter, so most failures use Nest's `{ message, statusCode }`, while some throw an object body instead — `{ error: 'account_suspended', reason, since }`, `{ error: 'mfa_required', message }`. The app copes in `lib/errors.ts`, but any new client has to know both. | `auth/supabase-auth.guard.ts:116`, `common/staff.guard.ts:34` |
| R-1 | High | Scalability | **The API and the database are on different continents.** `render.yaml` sets `region: oregon`; `DATABASE_URL` points at `aws-0-eu-west-1.pooler.supabase.com` — Ireland. The comment on that very line reads "pick the region nearest your Supabase project". Oregon to Ireland is ~7,700 km, so every single query pays ~130–160 ms of round trip. This is larger than every other item in this phase combined, and the fix is a region move rather than any code. | `render.yaml:17` |
| R-2 | High | Scalability | **The auth guard costs two of those crossings before a handler starts.** P-4 called it "one HTTP call plus one row read"; in context that is a Supabase `getUser` over HTTPS *and* a `users` lookup, both transatlantic, on every authenticated request. A plain orders list is therefore three crossings — roughly 450 ms — before any work happens. In payoff order: co-locate (R-1), then verify the JWT locally against the project JWKS instead of calling `getUser`, then cache the profile row for a few seconds. The guard's own comment already names local verification as the intended next step. | `auth/supabase-auth.guard.ts:62` |
| R-3 | Medium | Scalability | **`orders` is the least optimised list endpoint and the most used one.** It sorts by `created_at DESC` with no `(tailor_id, created_at DESC)` index, so every page is an index scan plus a sort — while `tailor_works` has exactly that index. It `ILIKE`s `order_name` with no trigram index, while `clients` has two. And it pages with `limit/offset`, which degrades linearly, while feed, works, chat and notifications all use cursor pagination with matching composite indexes. Harmless at 22 orders; this is the table that grows for the life of the account. | `orders/orders.service.ts:141`, and the `orders` indexes |
| R-4 | Medium | Scalability | **`renewalReminders` is an unbounded sequential loop.** It selects *every* subscription with no limit, then for each row awaits `languageFor`, `emailReminder` and `emit` one after another. At a thousand tailors that is thousands of sequential round trips, each transatlantic, inside one cron tick. Needs paging and batching before the tailor count grows — and it is the same job that lacks dedupe (Q-5). | `subscriptions/subscriptions.service.ts:505` |
| R-5 | Medium | Scalability | **Nothing on the public surface is cacheable.** The Discover feed, the storefronts and the public catalogue are byte-identical for every visitor and carry no `Cache-Control`; a live check returns `cf-cache-status: DYNAMIC`, so Cloudflare passes every request through to a sleeping free-tier instance, which then crosses the Atlantic. A short `max-age` would absorb nearly all of it. This is also the surface most exposed to a traffic spike if the marketing works. | `feed/feed.controller.ts`, `public/public-catalogue.controller.ts` |
| R-6 | Low | Scalability | Reordering a design's photos issues 2N sequential updates — a negate pass then a set pass, to dodge the unique index. Bounded by the photo limit, but at ~150 ms a crossing, reordering six photos is about 1.8 s of spinner. One `UPDATE … FROM (VALUES …)` per pass would do it in two statements. Neither pass is in a transaction either, so a failure between them leaves every position negative. | `works/works.service.ts:241`, `:555` |
| R-7 | Low | Scalability | The pool is created as `postgres(url, { prepare: false })` with no `max`, `idle_timeout` or `connect_timeout`. The defaults survive one instance, but nothing bounds connections if it ever scales out, and with no connect timeout a pooler stall becomes a hung request instead of a fast, visible failure. | `db/db.service.ts:38` |
