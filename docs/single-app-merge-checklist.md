# Single-app merge — build checklist

Working branch: `feat/single-app`. Each phase ends green on `tsc` + `i18n:check`; full
runtime check happens on-device. Tick items as they land. **One phase at a time —
wait for the go-ahead before starting the next.**

## Phase 0 — Prep
- [ ] Branch `feat/single-app` created
- [ ] Plan + checklist committed to the branch
- [ ] Inventory the client `lib/` files that duplicate the tailor's (delete-list for Phase 2)

## Phase 1 — Root + shell + role skeleton (dormant; tailors unaffected)
- [ ] `lib/role.ts` — `Mode` type + `resolveMode(me, preferred)`
- [ ] `lib/mode.tsx` — `ModeProvider` + `useMode()` (+ on-device `preferredMode`)
- [ ] Role-aware theme — client mode → rose palette; tailor mode → midnight (unchanged)
- [ ] `app/(client)/_layout.tsx` + placeholder `app/(client)/index.tsx` (rose stub)
- [ ] Root routes by mode: tailor→`(app)`, signed-in-non-tailor→`(client)`, else sign-in
- [ ] `tsc` + `i18n:check` green; tailor experience visually identical to today

## Phase 2 — Port the client experience
- [ ] Copy `seamflow-client/app/**` → `app/(client)/**`, repoint imports to shared `lib/*` + `@seamflow/ui`
- [ ] Move client components → `components/client/*`
- [ ] Delete duplicated client `lib/*` (use the tailor's)
- [ ] Merge client i18n under namespaced keys (`client.*`), all 6 languages
- [ ] `(client)` uses the rose theme + its own nav/home
- [ ] Checkpoint: non-tailor account lands on discovery; feed/inquire/orders/measurements/requests/chat work

## Phase 3 — Sign-up branch + switching
- [ ] One `sign-in.tsx` + "What brings you to SeamFlow?" step → seeds `preferredMode`
- [ ] "I'm a tailor" → existing `profile-edit?onboarding=1`; "Find a tailor" → discovery
- [ ] Switch affordances: tailor→"Browse as a customer"; client→"Set up your shop" (reuses ProfileGate `POST /me/tailor`)
- [ ] ~250ms crossfade on mode change; providers/cache persist (no reload)
- [ ] Public discovery browsable with no account

## Phase 4 — Notifications, deep links, polish
- [ ] Push tap routes into the correct tree (notification type → tailor/client route)
- [ ] Deep links (`/t/<slug>`, order share links) resolve in either mode
- [ ] No cross-tree imports; no theme bleed; skeletons on all data screens; lint/tsc/i18n green

## Phase 5 — Ship
- [ ] One `eas build` (prod) from the merged app; version bump
- [ ] Play release; listing copy refreshed (tailors + customers)
- [ ] `apps/seamflow-client` retired
