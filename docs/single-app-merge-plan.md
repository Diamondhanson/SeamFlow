# Merge plan: one app, two distinct experiences (tailor + client)

**Goal.** Fold `apps/seamflow-client` into `apps/seamflow-app` so there is **one installable app** that shows a **fully distinct tailor UI** or **fully distinct client UI** depending on who the user is — with **no visual bleed between them**, a **soft/switchable** role, and **all existing infrastructure inherited** (push, EAS, signing, store listing, Google OAuth).

---

## Ground rules (decisions locked in)

1. **Host = the tailor app** (`apps/seamflow-app`). It owns the live Play listing (`com.bambothanson.FashionApp`), the real EAS project, push credentials, and signing. We build *into* it. `apps/seamflow-client` is **archived, never shipped**.
2. **Two separate route groups, one mounted at a time:** `app/(tailor)/…` (midnight dark, CRM) and `app/(client)/…` (rose-pink, discovery). The root picks one. They never render together.
3. **Role is derived, not a hard wall.** You're a tailor if `me.tailor` exists; a client otherwise. A `preferredMode` (on-device) remembers a dual user's last choice. Switching modes is allowed and cheap.
4. **Discovery stays public** — the feed is browsable with no account (unchanged from the client app); sign-in is gated on action.

## What is INHERITED — do NOT redo any of this
- ✅ Push notifications (FCM `google-services.json`, the `notifications` pipeline)
- ✅ EAS project + build profiles, Android signing / Play App Signing, the Play listing
- ✅ Supabase auth, PIN lock, offline queue, i18n engine, dialog/error system
- ✅ The native Google Sign-In being set up now (same bundle id + SHA-1s + client IDs)

The client interface is *more screens in the same app the same user is signed into*, so all of the above flows through machinery that already exists.

---

## Target structure

```
apps/seamflow-app/
  app/
    _layout.tsx            ← ROOT: all shared providers, then <RoleRouter/>
    index.tsx              ← public entry → /(client)/discover (browsable, no auth)
    sign-in.tsx            ← ONE auth screen (adds the "who are you?" step)
    verify-otp.tsx, reset-password.tsx, auth/callback.tsx
    (tailor)/              ← the current (app)/* tree, renamed. Midnight theme.
      _layout.tsx          ← tailor stack + BottomChrome + ProfileGate
      index.tsx, orders/, clients/, invoices/, fabrics/, groups/, …
    (client)/              ← ported from seamflow-client. Rose-pink theme.
      _layout.tsx          ← client stack + client nav
      discover/, orders/, measurements/, requests/, messages/, claim.tsx, …
  lib/                     ← ONE shell (no more duplicated copies)
    auth-context, supabase, query-client, pin-lock, lock-context,
    dialog, notifications, i18n/, role.ts (new), theme/ (role-aware)
  components/
    tailor/  client/  (+ shared shell already in components/ and @seamflow/ui)
```

Nothing in the data layer moves — `@seamflow/schemas`, `@seamflow/api-client` (incl. `api.consumer.*`), `@seamflow/ui`, `@seamflow/utils`, and the backend are already shared and already support one account being both sides (`ChatService.resolveActor`/`sideOf` proves it).

---

## How the two UIs stay separate (the "no bleed" guarantee)

- **Separate trees:** `(tailor)` and `(client)` are independent expo-router groups with their own `_layout`, navigation, and home. A tailor screen never imports a client screen and vice-versa.
- **Role-aware theme:** one `ThemeProvider` at the root whose palette is chosen by active role — **midnight** for tailor, **rose-pink** for client. The shared `@seamflow/ui` primitives (Button, Input…) are theme-driven, so the *same* component automatically renders dark in tailor mode and pink in client mode. Shared bricks, separate buildings.
- **Root decides, once:** `<RoleRouter/>` reads `GET /me` + `preferredMode` and `<Redirect>`s into exactly one group.

```
// lib/role.ts  (the whole identity rule, in one place)
type Mode = 'tailor' | 'client';
resolveMode(me, preferred): Mode =
  !me            ? 'client'            // signed out → public discovery
  : preferred    ? preferred           // dual user's remembered choice
  : me.tailor    ? 'tailor'            // has a shop → tailor home
  :                'client';           // else → client home
```

## Smooth switching (a spec, not an afterthought)
- **Shared providers live at the true root** (Auth, QueryClient **cache**, Theme, Dialog, Lock) — above both groups — so switching **never re-logs-in or re-fetches**.
- The target home renders **instantly from the warm react-query cache**.
- The swap is wrapped in a **~250ms branded crossfade**; the dark↔pink theme change is instant.
- Switching is a **deliberate, occasional action** (Settings → "Switch to customer view" / "Set up your shop"), so it reads as an intentional mode change (like switching Google accounts), not a lag.

---

## Phased execution

### Phase 0 — Prep (0.5 day)
- Branch `feat/single-app`. Archive intent noted for `seamflow-client` (don't delete until Phase 5 passes).
- Inventory the client's `lib/` files that are near-duplicates of the tailor's (auth-context, supabase, query-client, pin-lock, lock-context, dialog, notifications, theme, i18n) — these get **deleted in favor of the tailor's** during the port.

### Phase 1 — Root + shell (the plumbing) (2–3 days)
- Rename `app/(app)/` → `app/(tailor)/`; update internal route strings `'/(app)/…'` → `'/(tailor)/…'` (mechanical, repo-wide).
- Rewrite `app/_layout.tsx` so **all shared providers sit at the root**, then render `<RoleRouter/>`.
- Add `lib/role.ts` (above) + a `useMode()` hook + `preferredMode` persistence (AsyncStorage, reuse the guides/reminders pattern).
- Make the theme **role-aware**: `lib/theme` resolves palette from `useMode()` (midnight vs rose). Verify both themes in light/dark + RTL.
- **Checkpoint:** tailor app works exactly as today, just under `(tailor)`; `GET /me` with a tailor row lands on the tailor home.

### Phase 2 — Port the client experience (3–5 days)
- Copy `seamflow-client/app/**` into `app/(client)/**`; delete its duplicated `lib/*` and repoint imports to the **shared** `lib/*` and `@seamflow/ui`.
- Move its 17 components to `components/client/*`.
- Merge its i18n dictionaries into the shared engine under **namespaced keys** (e.g. `client.discover.*`) so nothing collides with tailor keys; keep all 6 languages.
- Give `(client)/_layout.tsx` the rose theme + the client's own nav/home.
- **Checkpoint:** a signed-in account with **no** tailor row lands on the client discovery home; feed/inquire/orders/measurements/requests/chat all work against `api.consumer.*` and the shared endpoints.

### Phase 3 — Sign-up branch + switching (2–3 days)
- One `sign-in.tsx`. After account creation, add a **"What brings you to SeamFlow?"** step:
  - *Find a tailor / order clothes* → set `preferredMode='client'` → discovery.
  - *I'm a tailor* → set `preferredMode='tailor'` → the existing `profile-edit?onboarding=1` flow (creates the `tailors` row).
- Add the **switch** affordances:
  - Tailor Settings → "Browse as a customer" (sets client mode).
  - Client menu → "Set up your shop" → the **existing `ProfileGate`** `POST /me/tailor` flow → tailor mode.
- Wrap mode changes in the crossfade; confirm providers/cache persist across the swap.
- **Checkpoint:** a single account can flip both ways with no reload and correct theme each time.

### Phase 4 — Notifications, deep links, polish (2 days)
- Ensure a **push tap routes into the correct group** (map notification type → `(tailor)` vs `(client)` route). The pipeline is inherited; only the tap-routing needs role awareness.
- Verify deep links (`/t/<slug>`, order share links) resolve in either mode.
- Full QA pass: no cross-tree imports, no theme bleed, skeletons on every data screen (both sides), i18n parity (`npm run lint`/`i18n:check`), tsc clean.

### Phase 5 — Ship (1 day + review)
- One `eas build --platform android --profile production` from the merged app; version bump.
- Play release (same listing; refresh copy/screenshots to reflect "for tailors **and** their customers").
- Delete/retire `apps/seamflow-client`.

**Rough total:** ~2 focused weeks of app work. Zero backend/data work. Best sequenced **after** v1.2.0 clears review and the Google-native OAuth is done, so it lands as its own effort.

---

## Risks & mitigations
- **Bundle size** → expo-router already lazy-loads routes; the inactive tree never runs. Modest, mostly-JS growth.
- **Consumer-facing permissions** (the app carries tailor-only native modules like contacts/print) → they stay dormant for clients; justify them in the Play listing, or lazy-gate at use. Not a blocker.
- **i18n key collisions** → namespace all client keys (`client.*`).
- **Route-string churn** (`(app)`→`(tailor)`) → mechanical find-and-replace + tsc as the safety net.
- **Live app disruption** → all work on `feat/single-app`; the tailor experience is untouched behind the role root until Phase 5.

## Explicitly NOT in scope
No database migration, no new endpoints, no new push/EAS/signing/store setup, no OAuth redo. This is a mobile UI/navigation/packaging effort on top of an already-unified backend and design system.
