# SeamFlow — installable web app plan (Expo Web + PWA)

Status: proposal · Last updated: 2026-07-29

Ship a browser-based, installable version of the tailor app so anyone — iOS,
Android, desktop — can start testing now, without the Apple App Store. The
mobile view mirrors the native app as closely as possible; the desktop view gets
a wider, restructured layout. **One codebase, no new sub-project.**

The reason this is cheap: `seamflow-app` already depends on `react-native-web`
and already has a `"web": "expo start --web"` script. Expo's web target renders
your existing screens in the browser through react-native-web, and your data
layer (`@seamflow/api-client`, `@seamflow/schemas`) is plain, platform-neutral
TypeScript. So we're turning on and building out an existing target — not
starting a new front-end.

Framing to hold: this is a **testing / preview channel**, not a full iOS
replacement. Push, offline, and native-hardware polish are why the native apps
still matter (see the audit).

---

## 1. Does this need a new project? No.

The installable web app is the **web build target of the existing
`seamflow-app`** (`expo export --platform web` → a static `dist/` folder). Same
screens, same api-client, same i18n, same theme. We are not forking the app.

Do **not** confuse it with the existing `apps/seamflow-web` — that's a
**Next.js** app for the client-facing magic-link order view and public site, a
different audience. It stays as-is.

The *only* scenario that would justify a new sub-project is a **fully bespoke
desktop tailor experience** that looks like a different product from the mobile
app (dense dashboards, DOM/Tailwind, hover-rich). That's a deliberate later
choice — a separate Next.js front-end reusing only `api-client`/`schemas`/
`utils`, not the RN screens. Out of scope here; for v1 the desktop view is a
responsive layer on the one codebase (§3).

---

## 2. What's preserved vs what degrades on web

Everything server-driven works; native-hardware features are what degrade. This
audit is against `seamflow-app`'s actual dependencies.

### Works on web

| Area | Why it carries |
|---|---|
| All business flows — clients, orders + status, measurements, templates, invoices, designs, fabrics, group orders, search | Server-driven via `@seamflow/api-client` (platform-neutral) |
| Auth — Supabase magic-link / OTP | `expo-auth-session` / `expo-web-browser` + Supabase JS work on web (redirect flow) |
| **Image upload + measurement-scan feature** | `expo-image-picker` works on web (file input; camera capture on mobile web). Scan was designed "snap **or** upload" — the upload path carries web |
| Offline **reads** | react-query cache persisted via `@react-native-async-storage/async-storage` → `localStorage` on web; the persist-client already used |
| Voice Tier 1 | `expo-speech` + `expo-speech-recognition` map to the browser Web Speech API (Chrome/Android good; iOS Safari limited) |
| Share links / WhatsApp | `wa.me` links + Web Share API (`expo-sharing` degrades gracefully) |
| Clipboard, network status | `expo-clipboard`, `@react-native-community/netinfo` support web |
| i18n (en/fr), Restyle theming, skeletons, animations | react-native-web + `@shopify/restyle` + reanimated run on web |

### Degrades or unavailable on web

| Feature | Native dep | Web reality → fallback |
|---|---|---|
| **Push notifications** | `expo-notifications` | Native push doesn't work on web; web push is a separate build and unreliable on iOS PWAs. **Biggest loss.** For web, lean on in-app + email reminders; don't promise push |
| Add client from contacts | `expo-contacts` | No web API → hide the button on web; manual entry |
| Secure token storage / PIN at rest | `expo-secure-store` | No web → falls back to `localStorage`/async-storage (weaker at rest); PIN lock still functions |
| Invoice PDF / print | `expo-print` | Limited web → use browser print-to-PDF or generate the PDF server-side |
| Date pickers | `@react-native-community/datetimepicker` | Web support is limited → provide a web date-input fallback |
| File writes / exports | `expo-file-system` | Limited web → use blob download |
| Any WebView screens | `react-native-webview` | Renders only as an iframe on web; avoid on web routes |
| Haptics, Apple sign-in, biometrics | `expo-haptics`, `expo-apple-authentication` | No-ops / native-only (Apple sign-in already deferred) |

**The core engineering task is this audit made real:** guard each
web-incompatible call with `Platform.OS === 'web'`, provide the fallback (or hide
the feature on web), and make sure no screen crashes because a native module is
missing. This is the bulk of the effort — bounded and mechanical, not a rewrite.

---

## 3. Mobile mirror vs desktop layout (one codebase)

Both live in the same Expo-web build, switched by screen width
(`useWindowDimensions()`; `react-native-responsive-dimensions` is already a dep).

- **Mobile web (< ~768px):** render the app essentially as-is. This *is* the
  mobile mirror — same screens, same components — so fidelity is high by default.
- **Desktop (≥ ~1024px):** keep the same screens but swap the **navigation
  shell** — bottom tabs → a persistent left side-rail + top bar — and wrap
  content in a max-width container. Give a few high-value screens a **two-column
  master–detail** layout (e.g. orders list left, order detail right) instead of
  drill-in navigation.

Pattern: a `useBreakpoint()` hook + a responsive `AppShell` that picks tabs vs
side-rail; most screens just widen inside the shell, and only a handful
(dashboard, orders, clients) get a desktop variant. You are **not** rebuilding
every screen — you restructure the shell and specially lay out a few.

Honest boundary: this yields a desktop that's genuinely different in *shell and
layout* but shares the app's visual DNA. A desktop that looks like a *different
product* is the separate-Next.js route from §1, not this.

---

## 4. Making it installable (PWA)

The piece that turns the web build into an app-like, installable experience.

- **Web manifest** — name, icons (reuse the app icon set), theme/background
  color, `display: standalone`, start URL. Expo can emit much of this from
  `app.json`'s web config; verify icon sizes (incl. iOS touch icons).
- **Service worker** — cache the app shell so it loads fast and survives flaky
  networks (offline *shell*; offline *data* is the react-query persist cache).
- **HTTPS** — required for install + service worker; every host below provides
  it automatically.
- **iOS install UX** — iOS has **no** automatic install prompt (Android does).
  Add a small in-app hint for iPhone users: *Share → Add to Home Screen*. Note
  the iOS PWA caveats: storage can be evicted if unused, no background sync,
  push unreliable.
- **Android bonus** — since you're already shipping to Play, this same web build
  can later be wrapped as a **TWA** and submitted to Play Store from the web
  assets. The work isn't throwaway.

---

## 5. Hosting

The web build is a **static SPA** (`expo export --platform web` → `dist/` of
HTML/JS/CSS). Your API stays where it is (the Render service in `render.yaml`);
the web app just calls it over the internet like the phone does. You already own
**seamflowtech.com**, so `app.seamflowtech.com` is the natural home.

### Prerequisites (host-independent — do these regardless)

- **CORS on the API.** Native has no browser origin, so the API never needed it;
  web does. Add the web origin to NestJS CORS —
  `app.enableCors({ origin: ['https://app.seamflowtech.com', /* preview URLs */] })`
  in `apps/seamflow-api/src/main.ts` (not currently present). Without it the app
  loads but every data call is blocked.
- **Supabase Auth URLs.** Add `https://app.seamflowtech.com` to Supabase's
  allowed redirect / site URLs, or magic-link / OTP sign-in breaks on web.
- **Build-time env.** `EXPO_PUBLIC_*` vars are inlined at build time — set
  `EXPO_PUBLIC_API_URL` (production API, not the `10.0.2.2` dev value),
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` before building.

### Option A — Render static site (consistent with today)

Add a **Static Site** service next to `seamflow-api` (same dashboard/repo):

- Build command: `pnpm install && pnpm --filter seamflow-app exec expo export --platform web`
- Publish directory: `apps/seamflow-app/dist`
- Rewrite rule: `/*` → `/index.html` (SPA fallback for client-side routing)
- Set the `EXPO_PUBLIC_*` build env vars; attach `app.seamflowtech.com`.

### Option B — Vercel

New Vercel project on the same repo (separate from any `seamflow-web` project):

- **Root Directory:** `apps/seamflow-app`; enable *"Include files outside the
  root directory"* so pnpm can resolve `@seamflow/*` from `packages/`.
- **Framework Preset:** **Other** (force it — don't let it auto-detect Next).
- **Install:** `pnpm install`; **Build:**
  `pnpm --filter seamflow-app exec expo export --platform web`;
  **Output Directory:** `dist`.
- **SPA routing:** add `apps/seamflow-app/vercel.json`:

  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

  Vercel serves real files first, so assets still load; only app paths fall back
  to `index.html`.
- Set `EXPO_PUBLIC_*` in project env (Production); add `app.seamflowtech.com`
  under Domains (CNAME to `cname.vercel-dns.com`).
- **Plan note:** the free **Hobby** tier is fine for beta but is intended for
  non-commercial use — move to a paid plan (or use Render/Cloudflare Pages, whose
  free static hosting has no such restriction) once SeamFlow is a paid product.

### Either way

- Connect to GitHub for **auto-deploy on push** — instant updates, no store
  review.
- Heads-up for testers: the API's free Render plan **sleeps on inactivity**, so
  the first request after a quiet spell is slow (cold start) — not a bug.

---

## 6. Value & shortcomings

**Value:** the cheapest possible way to get iOS *and* desktop testers today —
$0 hosting, no $99 Apple fee, one URL, instant updates. And you start at high
fidelity because the mobile web view *is* your app rendered by react-native-web.
Strong fit for your current constraint.

**Shortcomings to accept:** no reliable push on web (esp. iOS PWA); weaker
at-rest security (no secure-store); no live-camera/contacts/native-print; iOS
install is manual and its storage can be evicted; free-tier API cold starts.
These are why the native apps remain the real product — web is the on-ramp.

---

## Build checklist

**Turn on & audit (the core work)**

- [ ] Confirm `expo export --platform web` builds and the app boots in a browser.
- [ ] Native-dependency audit (§2): `Platform.OS === 'web'` guards + fallbacks
      for notifications, contacts, secure-store, print, datetimepicker,
      file-system, webview; hide unavailable actions on web.
- [ ] Verify auth (magic-link/OTP), image upload + measurement-scan, and voice
      Tier 1 on web.

**Responsive layout**

- [ ] `useBreakpoint()` + responsive `AppShell` (bottom tabs ↔ side-rail).
- [ ] Desktop master–detail for orders/clients/dashboard; max-width container.

**PWA**

- [ ] Web manifest (icons incl. iOS touch icons, standalone, theme colors).
- [ ] Service worker for app-shell caching.
- [ ] In-app "Add to Home Screen" hint for iOS.

**Hosting**

- [ ] API CORS allows the web origin; Supabase redirect/site URLs updated.
- [ ] `EXPO_PUBLIC_*` production build env set.
- [ ] Deploy (Render static site **or** Vercel) with SPA `/* → /index.html`
      rewrite; attach `app.seamflowtech.com`; enable auto-deploy.

**Verify**

- [ ] Deep-link/refresh on a nested route resolves (SPA fallback works).
- [ ] Data loads from the browser (CORS ok); sign-in completes on web.
- [ ] Installs to home screen on Android and iOS; launches standalone.
- [ ] `npm run lint` (incl. `i18n:check`) passes; no web-only crashes from
      missing native modules.

---

## If you only remember three things

1. **No new project.** It's the web target of the app you already have —
   `react-native-web` and the `web` script are already in place. Turn on, audit,
   build out; don't fork.
2. **Server flows carry; native hardware degrades.** Clients/orders/measurements/
   invoices/scan-by-upload all work on web; push, contacts, secure-store, and
   live camera are the losses. Guard and fall back — it's the main effort.
3. **Static site + two prerequisites.** Deploy the `dist/` folder to Render or
   Vercel with an SPA rewrite; it won't work until the API allows the web origin
   (CORS) and Supabase knows the web URL.
