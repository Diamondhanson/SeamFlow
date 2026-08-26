# Shareable tailor catalogue (`/t/<slug>`) — plan & handoff

**Status:** in progress — foundation landed, API/web/app layers not started.
**Started:** 2026-08-26.
**Last touched:** 2026-08-26.

Written as a pickup point for a fresh context. Read the whole thing before
editing; several decisions below were made deliberately and reversing one by
accident will cost more than reading.

> ## ⚠️ Apply the migration before anything else
>
> `supabase/migrations/20260826120000_tailor_catalogue_share.sql` is committed
> but **has not been applied to the shared Supabase**, and the Drizzle schema
> that names those columns is already on `main`.
>
> `render.yaml` sets `autoDeploy: true`, so main is already building. Drizzle
> puts every column it knows about into its SELECT lists, which means that once
> this deploys, **every query touching `tailors` asks for `slug` and
> `public_whatsapp`** — columns the database does not have yet. That reaches
> further than the catalogue work: feed, storefront, chat, requests, invoices,
> order share links and account all select the tailor row.
>
> The migration is purely additive (`add column if not exists`), so applying it
> is the fix and carries no data risk. Do it first.

---

## What we're building

A tailor shares their catalogue — the designs they actually made — as one link.

- Recipient **has the client app** → the link opens their tailor profile in the app.
- Recipient **doesn't** → the same link opens in a browser, showing the same
  profile and catalogue, with a CTA to get the client app ("coming soon" for now)
  and a WhatsApp button to contact the tailor directly.

One URL, three surfaces, one data source.

---

## Decisions already made — treat as settled

**1. Not a token, not an expiry.** The obvious move is to reuse
`share-links` (the `/o/<code>` order links). Don't. Order links are secret and
expire because they expose one client's private order. A catalogue is *already*
world-readable via `GET /feed`. Its whole job is to be pasted around, previewed
in WhatsApp and indexed. So: **one permanent, stable, public URL per tailor** —
no minting per share, no TTL. A tailor puts it in an Instagram bio once and
never touches it again.

**2. The URL carries a slug, not a UUID.** `/t/mama-ngozi-couture`, never
`/t/3f9a8c21-…`. This link goes on printed shop signs; a UUID in that position
reads as machine-generated and gets less trust.

**3. The catalogue is exactly the published `tailor_works`.** No separate
curation surface. The codebase already committed to "one unified portfolio"
(see the comment on `FeedController.publish` explaining why publishing from an
order adopts into `tailor_works` first). Adding a second notion of "featured"
would re-open a decision that was closed on purpose.

**4. The public WhatsApp number is a NEW opt-in column, never `users.phone`.**
`users.phone` is a sign-in credential. `TailorPublicProfile` has carried an
explicit "no phone, no email" rule since the discovery feed shipped. Reusing it
would retroactively publish every tailor's login number the moment they shared
a link. `tailors.public_whatsapp` is separate, null by default, and only ever
set by a tailor typing it into the storefront screen. **Nothing may copy
`users.phone` into it.** When null, the page shows no contact button at all.

**5. Host is `www.seamflowtech.com`.** Already canonical across the codebase
(`SITE.url`, `metadataBase`, and `EXPO_PUBLIC_WEB_URL` in both `eas.json`s).
This is not cosmetic — see the App Links trap below.

---

## What is built (committed)

| File | What |
| --- | --- |
| `supabase/migrations/20260826120000_tailor_catalogue_share.sql` | `tailors.slug` + `tailors.public_whatsapp`, case-insensitive partial unique index on `lower(slug)`, format check constraint. **NOT YET APPLIED to the shared Supabase.** |
| `apps/seamflow-api/src/db/schema/users.ts` | Same two columns in Drizzle. |
| `packages/utils/src/slug.ts` | `slugifyBusinessName`, `isValidSlugShape`, `isReservedSlug`, `withSlugSuffix`, `catalogueUrl`, `RESERVED_SLUGS`. |
| `packages/utils/src/slug.test.ts` | 15 tests, passing. |
| `packages/utils/src/share-message.ts` | `formatCatalogueShareMessage`. |
| `packages/schemas/src/tailor-profile.ts` | `TailorSlugSchema`, `PublicWhatsappSchema`, `slug` on `TailorMiniProfile`, `whatsapp` on `TailorPublicProfile`, `slug`/`publicWhatsapp` on the update schema, `CatalogueLinkSchema`. |
| `apps/seamflow-api/src/feed/feed.service.ts` | Projections only — `toMiniProfile` returns `slug`, `toPublicProfile` returns `whatsapp`. |

Typechecks clean across api / utils / api-client; `@seamflow/utils` tests pass.

---

## What is NOT built — do these in order

### 1. API (`apps/seamflow-api`)

**`FeedService.ensureSlug(tailorId): Promise<string>`** — lazy mint.
`slugifyBusinessName(businessName)` → if empty (non-Latin name), fall back to
something stable and readable. Then resolve collisions with `withSlugSuffix`
(`-2`, `-3`, …), also rejecting `isReservedSlug`. Persist and return. Idempotent:
if `slug` is already set, return it untouched — a tailor's address must never
change under them once shared.

Race: two concurrent first-shares can both pick `mama-ngozi`. The unique index
is the arbiter — catch the unique violation and retry with the next suffix
rather than pre-checking and hoping.

**`FeedService.storefrontBySlug(slug, query)`** — resolve `lower(slug)` → tailor,
then reuse the existing `storefront()`. Must apply `ownerIsLive()` so a tailor
in their 30-day deletion grace disappears from the public page immediately.

**`FeedService.updateProfile`** — handle the two new fields. `slug` must
validate shape, reject reserved, and answer **409 on collision** (do not
silently substitute a variant — a tailor editing this has a specific address in
mind). Also mirror the existing `city` denormalisation pattern; `slug` is not
denormalised onto `feed_posts`, so nothing to sync there.

**`POST /me/catalogue-link`** (authed) → `CatalogueLink { url, slug, publishedCount }`.
Calls `ensureSlug`, builds the URL with `catalogueUrl(WEB_BASE_URL, slug)`.
`publishedCount` exists so the app can warn before sharing an empty catalogue.

**`GET /public/tailors/:slug/catalogue`** — `@Public()`, in
`apps/seamflow-api/src/public/`, following `public-orders.controller.ts`. Thin
wrapper over `storefrontBySlug`.

### 2. Contracts

Add a `catalogue` resource (or extend `resources/feed.ts`) in
`packages/api-client`. Then rebuild both, per CLAUDE.md:

```bash
pnpm --filter @seamflow/schemas build && pnpm --filter @seamflow/api-client build
```

### 3. Web (`apps/seamflow-web`)

- `app/t/[slug]/page.tsx` + `app/fr/t/[slug]/page.tsx`. SSR, styled after
  `app/o/[token]/page.tsx`, EN/FR through `lib/i18n.ts`.
- Profile header, works grid, two CTAs: **Message on WhatsApp** (primary, only
  when `whatsapp` is non-null) via `wa.me/<digits>`; **Get the app — coming
  soon** (secondary).
- `app/t/[slug]/opengraph-image.tsx` — tailor name over a grid of their top
  works. **Do not skip this.** It is what makes the link look legitimate when
  pasted into WhatsApp, which is the primary sharing channel.
- Empty catalogue and unknown slug both need real states, not `notFound()` alone.

### 4. Tailor app (`apps/seamflow-app`)

- `lib/share-catalogue.ts`, modelled closely on `lib/share-order.ts`
  (WhatsApp → `wa.me` → OS share sheet → copy link, all via `useDialog()`).
- Share entry points: `app/(app)/works/index.tsx` ("My Designs") and
  `app/(app)/feed/storefront.tsx`.
- Storefront screen gains: editable slug (show the full URL live) and the
  public WhatsApp field, normalised to E.164 with `normalizePhone` **before**
  it reaches the API.
- Guard the zero-published case — a tailor's first share must not be an empty page.
- EN/FR keys in `lib/i18n/locales/feed.ts`; `npm run i18n:check` must pass.
- Skeletons per `docs/skeletons.md` if any new loading state appears.

### 5. Client app (`apps/seamflow-client`) + deep links

- `app/t/[slug].tsx` — resolves by slug via the same public endpoint, so web and
  app read one source. The existing `app/discover/tailor/[tailorId].tsx` stays
  (it's reached by tailor id from the feed); factor the shared view if it helps.
- `app.json`: add the Android App Links intent filter with `"autoVerify": true`
  for host `www.seamflowtech.com`, path prefix `/t`, and `associatedDomains`
  for iOS (inert until the Apple Developer Program is paid).
- `apps/seamflow-web/public/.well-known/assetlinks.json` — Android.
  `apple-app-site-association` — iOS, no file extension, served as
  `application/json`.

---

## Traps

**The stale-`dist` landmine.** The API resolves `@seamflow/schemas` from its
built `dist`, not from source. Editing a schema and typechecking the API proves
nothing until you rebuild the package. This already bit once: the API typechecked
clean while `feed.service.ts` was missing two now-required fields, and the errors
only appeared after `tsc -p packages/schemas`. **Rebuild schemas before trusting
any API typecheck.**

**App Links match an exact host, and a redirect does not save you.**
`seamflowtech.com` and `www.seamflowtech.com` are different hosts to Android and
iOS. If a link is minted on one host and `.well-known` is served from the other,
the OS hands the URL to the browser before any 301 runs. Whatever `WEB_BASE_URL`
is set to on Render must be the exact host serving `.well-known` and listed in
`associatedDomains`. `catalogueUrl()` in `packages/utils/src/slug.ts` is the
single place the URL is built — keep it that way.

**The regex lives in three places** — `packages/utils/src/slug.ts`,
`TailorSlugSchema`, and the `tailors_slug_format` check constraint. Deliberate
(the value ends up inside a URL), but change one and you must change all three.

**Migration is not applied.** See the banner at the top — this is not just a
"the new work won't run" problem. The Drizzle schema on `main` already names
these columns, so until the migration is applied, any deployed build errors on
every query that reads a tailor row.

---

## Testing on Android

Everything except app-interception is testable immediately: the web page in
Chrome, the OG card (paste the link into a WhatsApp chat — the highest-value
test), the WhatsApp CTA, and the tailor-app share flow via a normal EAS build.

App-interception needs the client app built, which has never happened —
`apps/seamflow-client/app.json` still reads `"projectId": "REPLACE_WITH_EAS_PROJECT_ID"`.
Its `eas.json` is otherwise ready (preview profile → Android APK → live Render
API). This is not blocked by money, unlike iOS.

```bash
pnpm --filter seamflow-client exec eas init
```

```bash
pnpm --filter seamflow-client exec eas build -p android --profile preview
```

Then `eas credentials` → release keystore SHA-256 → into `assetlinks.json` →
redeploy web → install the APK.

Notes: debug and release builds are signed with **different** keys, so keep
`assetlinks.json`'s fingerprint array able to hold both. Verification happens at
install time over the network, so deploy the web page *first* or force a
re-check. Test on a real device — App Links verification is unreliable on
emulators without Play Services.

```bash
adb shell pm verify-app-links --re-verify com.bambothanson.seamflowclient
```

```bash
adb shell am start -a android.intent.action.VIEW -d "https://www.seamflowtech.com/t/your-slug"
```

Real-world caveat: Instagram's in-app browser tends to swallow links rather than
handing off to the OS. WhatsApp on Android honours App Links correctly, so the
main channel is fine; no config on our side changes Instagram's behaviour.

---

## iOS

Blocked on the $99/yr Apple Developer Program (already tracked at
`docs/ROADMAP.md` line ~1859). Universal Links need an
`apple-app-site-association` signed against a Team ID. Write the file and the
`associatedDomains` entry now and leave them inert — switching iOS on later is
then config, not code.
