# Shareable tailor catalogue (`/t/<slug>`) — plan & status

**Status:** built end to end. Blocked on one operational step: the migration.
**Started:** 2026-08-26. **Last touched:** 2026-08-26.

**Migration applied 2026-08-26.** `GET /feed` on Render is back to 200 and
`slug` projects as null across the feed, which is correct — minting is lazy and
no tailor has shared yet.

> **Do not `supabase db push --include-all`.** Remote migration history has
> drifted: `schema_migrations` is missing at least `20260707120000`,
> `20260707130000` and `20260708120000`, applied out of band. The CLI offers to
> "insert them before the last migration"; accepting would re-run them. Apply
> single files with `psql -f` instead, and note that `DATABASE_URL` points at
> the *transaction* pooler (6543) where the CLI dies on
> `prepared statement "lrupsc_1_0" already exists` — use `:5432`.

---

## What this is

A tailor shares one permanent link to the work they have actually made.

- Recipient **has the client app** → App Links hand the URL to the app.
- Recipient **doesn't** → the same URL renders as a web page, with a WhatsApp
  button to reach the tailor and a link to get the app.

One URL, three surfaces (web page, WhatsApp preview card, client app), one
endpoint behind all of them.

---

## Decisions — settled, do not reopen

**1. Not a token, not an expiry.** Order links (`/o/<code>`) are secret and
expire because they expose one client's private order. A catalogue is *already*
world-readable via `GET /feed`; its job is to be pasted around and indexed. One
permanent public URL per tailor, no minting per share, no TTL.

**2. A slug, never a UUID.** `/t/mama-ngozi-couture`. This goes on printed shop
signs, where a UUID reads as machine-generated and gets less trust.

**3. The catalogue is exactly the published `tailor_works`.** No second
curation surface — that would re-open the "one unified portfolio" decision.

**4. `tailors.public_whatsapp` is a NEW opt-in column, never `users.phone`.**
`users.phone` is a sign-in credential. Null by default; when null the page
shows no contact button at all. **Nothing may copy `users.phone` into it.**

**5. Host is `www.seamflowtech.com`, exactly.** App Links match an exact host
and verification does not follow redirects. `catalogueUrl()` in
`packages/utils/src/slug.ts` is the single place the URL is built.

**6. Slugs are minted lazily, on first share.** Backfilling every tailor would
hand out public addresses to shops that never asked to be findable. Once set, a
slug is never changed under the tailor — by the second call it may be on a sign.

---

## What is built

### Database + shared packages

| File | What |
| --- | --- |
| `supabase/migrations/20260826120000_tailor_catalogue_share.sql` | `slug` + `public_whatsapp`, case-insensitive partial unique index, format check. **Not yet applied.** |
| `apps/seamflow-api/src/db/schema/users.ts` | Same two columns in Drizzle. |
| `packages/utils/src/slug.ts` | `slugifyBusinessName`, `isValidSlugShape`, `isReservedSlug`, `withSlugSuffix`, `fallbackSlugForId`, `catalogueUrl`. 19 tests. |
| `packages/utils/src/phone.ts` | `normalizePhone` now takes a plain `string` country — callers get it from data and could not narrow it without a cast each. |
| `packages/schemas` | `TailorSlugSchema`, `PublicWhatsappSchema`, `CatalogueLinkSchema`; `slug`/`publicWhatsapp` on `Tailor`. |

### API

- `FeedService.ensureSlug` — lazy mint. Derives from the business name, falls
  back to `fallbackSlugForId` for a name that folds to nothing, resolves
  collisions with `-2`, `-3`, … Writes and lets the unique index arbitrate
  rather than pre-checking, because two first-shares in the same second would
  both see the name as free.
- `FeedService.catalogueLink` — `{ url, slug, publishedCount }`.
- `FeedService.storefrontBySlug` — case-insensitive lookup, applies
  `ownerIsLive()` so a tailor in their deletion grace 404s as a whole page.
- `FeedService.updateProfile` — accepts `slug` and `publicWhatsapp`; **409 on
  collision**, never a silent substitute.
- `POST /me/catalogue-link` (authed), `GET /tailors/by-slug/:slug/storefront`
  and `GET /public/tailors/:slug/catalogue` (both public).

### Web (`apps/seamflow-web`)

- `app/t/[slug]/page.tsx` + `app/fr/t/[slug]/page.tsx`, SSR, `revalidate = 300`.
- `components/CatalogueGrid.tsx` — the Pinterest-style wall. **CSS multi-column,
  not a JS masonry library**: the page is read on cheap phones over patchy
  connections, and a JS layout pass means one column that jumps once the script
  boots. Tiles reserve their true aspect ratio from the stored width/height, so
  nothing reflows as images arrive.
- Lightbox with a scroll lock that **pins the body at a negative offset** rather
  than setting `overflow: hidden`. The obvious version causes the bug it is
  meant to prevent: hiding body overflow collapses the scroll height, so the
  browser clamps the offset — measured 700px → 383px on a twelve-piece
  catalogue — and closing leaves you somewhere you never were.
- `app/t/[slug]/opengraph-image.tsx` — the tailor's name and city over a strip
  of their real work. The highest-leverage part of the feature: WhatsApp is the
  primary channel and a link with no preview reads as spam.
- `app/.well-known/assetlinks.json/route.ts` and
  `.../apple-app-site-association/route.ts` — **env-driven, not static files**,
  so no placeholder fingerprint is ever published. See "Turning on deep links".
- `robots.ts` — `/t/` is deliberately indexable, unlike `/o/` and `/i/`.

### Tailor app (`apps/seamflow-app`)

- `lib/share-catalogue.ts` — WhatsApp → OS share sheet → copy link, all through
  `useDialog()`. Unlike share-order there is no recipient, so the WhatsApp deep
  link carries no `phone` and lands on the contact/status picker.
- Refuses to share a catalogue with zero published pieces unless the tailor
  explicitly says "share anyway".
- Share button on **My Designs**, beside Add.
- Storefront editor gains the slug field (showing the whole assembled URL live)
  and the public WhatsApp field, normalised to E.164 before it reaches the API.
- EN/FR keys in `lib/i18n/locales/feed.ts`; `i18n:check` passes.

### Client app (`apps/seamflow-client`)

- `components/StorefrontView.tsx` — the shop layout, extracted so `/t/<slug>`
  and `/discover/tailor/<uuid>` render the same screen. The deep-link route is
  the one nobody remembers to test; sharing the view means a change cannot land
  on one and miss the other.
- `app/t/[slug].tsx` — **outside `(app)`** on purpose: a deep link must render
  for someone who installed the app thirty seconds ago and has no session.
- `app.json` — Android `intentFilters` with `autoVerify` for `/t` and `/fr/t`,
  and iOS `associatedDomains`.

---

## Verified

Typechecks clean across api / web / tailor app / client app; 32 utils tests
pass; both i18n guards pass; `next build` succeeds. The web page was rendered
against a stubbed API and checked in a browser: masonry lays out in 4 columns
on desktop and 2 on mobile with 11 distinct tile heights across 12 pieces and no
horizontal overflow; the lightbox restores scroll position exactly; XAF prices
render as `FCFA 45,000` with no phantom decimals; empty-catalogue, unknown-slug
and French variants all render; the OG card generates as a 187KB PNG; both
`.well-known` documents are correct with and without their env vars.

Verified against the **real** API and the migrated database: unknown, malformed
and path-traversal-shaped slugs all 404 rather than 500; `POST /me/catalogue-link`
is 401 without a token; the not-found page renders with `noindex`; and a live
storefront payload carries every field the page reads, including the legacy
`width`/`height`/`startingPrice` nulls that exercise the fallback paths.

**Not yet exercised:** minting a real slug and rendering a real catalogue. That
happens the first time a tailor taps Share on a deployed build.

---

## Remaining operational steps

1. **Apply the migration** (above). Then re-check
   `curl -s -o /dev/null -w "%{http_code}" https://seamflow-api.onrender.com/feed?limit=1`
   → should be 200.
2. **Confirm Render's `WEB_BASE_URL` is exactly `https://www.seamflowtech.com`.**
   It is what `catalogueUrl` builds links from, and it must match the host
   serving `.well-known` character for character.
3. **Deploy the web app**, then paste a real `/t/<slug>` into a WhatsApp chat —
   the single highest-value test of the whole feature.

## Turning on deep links

Android is not blocked by money; it has simply never been built:

```bash
pnpm --filter seamflow-client exec eas init
```

```bash
pnpm --filter seamflow-client exec eas build -p android --profile preview
```

Then `eas credentials` → SHA-256 fingerprint → set `ANDROID_CERT_FINGERPRINTS`
in Vercel (comma-separated) → redeploy web → install the APK.

List **every** key that signs a build you want to intercept links: debug and
release differ, and with Play App Signing it is Google's key users actually get,
not your upload key. Verification happens at install time over the network, so
deploy the web change first. Test on a real device — App Links verification is
unreliable on emulators without Play Services.

```bash
adb shell pm verify-app-links --re-verify com.bambothanson.seamflowclient
```

```bash
adb shell am start -a android.intent.action.VIEW -d "https://www.seamflowtech.com/t/your-slug"
```

Real-world caveat: Instagram's in-app browser swallows links rather than handing
off to the OS. WhatsApp on Android honours App Links correctly, so the main
channel is fine; nothing on our side changes Instagram's behaviour.

**iOS** is blocked on the $99/yr Apple Developer Program (`docs/ROADMAP.md`
~line 1859). The `apple-app-site-association` route and the `associatedDomains`
entry are written and inert; set `APPLE_TEAM_ID` and ship a build to switch it
on. No code change needed.

---

## Traps

**The stale-`dist` landmine.** The API resolves `@seamflow/schemas` from its
built `dist`, not from source. Rebuild schemas before trusting any API
typecheck — this has bitten once already.

**Never pass the copy object to `CatalogueGrid`.** It is a client component and
`CatalogueCopy` holds functions; React cannot serialize those across the
boundary and throws at render, not at build. `next build` passes either way.
Keep that prop list flat and primitive.

**The slug regex lives in three places** — `packages/utils/src/slug.ts`,
`TailorSlugSchema`, and the `tailors_slug_format` check constraint. Deliberate,
because the value ends up inside a URL. Change one, change all three.

**The feed page limit is 48, and asking for more is a 400.** `loadCatalogue`
rethrows anything that is not a 404, so an over-large `limit` turns into a 500
on the whole page — correct, since it is a bug rather than a missing shop, but
it cost a debugging round. `CATALOGUE_PAGE_SIZE` is pinned to `FEED_MAX_LIMIT`
from `@seamflow/schemas`; import it rather than writing a number.

**A stub that ignores query parameters will hide exactly that bug.** The
catalogue rendered perfectly against a local stub and 500'd against the real
API on the first request. Point at the real thing before believing a page works.

**`startingPrice` is a numeric string in MAJOR units.** "25000.00" is twenty-five
thousand francs. Do not divide by 100 — that mistake is easy because payment
code often stores minor units, and it would show every West African price two
orders of magnitude too small.
