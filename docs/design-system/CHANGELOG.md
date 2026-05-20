# Atelier design system — changelog

Reverse-chronological. Entries land when a token / primitive / migration ships.

## 2026-05-20 — Wrapper-component conversion (visible app-wide flip)

After the foundation landed nothing felt obviously different because every screen except sign-in was still rendering through legacy wrappers (`components/Button.tsx`, `Input.tsx`, `Tile.tsx`) that didn't reference the new font families. This pass converts those wrappers into thin Atelier adapters so the new typography + pill buttons + floating-label inputs appear on every screen at once, with no screen-level code changes required.

- `components/Button.tsx` → forwards to `@seamflow/ui`'s `Button`. Legacy variant `danger` maps to Atelier `destructive`; `primary` / `secondary` are pass-through. Every button across the app now picks up:
  - Pill radius (was 10 px square-ish → now full pill)
  - Inter 600 button label (was system sans 16)
  - Scale-to-0.97 spring on press
  - Loading state, icon slots (unused by legacy callers)
- `components/Input.tsx` → forwards to Atelier `Input`. Every form across the app now has:
  - Floating label (Inter 500 → Inter 400 size transition on focus)
  - Hairline 1 px border
  - 2 px focus ring at 30 % primary opacity
  - 14 px corner radius
  - Animated error / helper caption slide-in
  - `placeholder` still honored as an in-field hint after the label floats up — backwards compatible with all existing callers
- `components/Tile.tsx` → still owns its layout / icon, but text is now rendered via Atelier `<Text variant="h3">` (Inter 600 18/24) for titles and `<Text variant="caption">` for descriptions. Tile background + border pull from `theme.colors.{surface, hairline, primary}` instead of the legacy palette.

Screen text upgrades:

- `app/(app)/index.tsx` (home) — greeting + onboarding card use Atelier `<Text variant="h1">` / `"h3"` / `"bodySm"`. The screen-level StyleSheet block of bespoke text styles is gone; all typography flows through the primitive.
- `app/(app)/me.tsx` (profile) — same treatment for "Business profile" heading + "Signed in as" line.
- Navigation header titles globally → Fraunces 600 18 (was system sans 17 600). Configured once in both `app/_layout.tsx` and `app/(app)/_layout.tsx` `screenOptions`.

Net visible change after this pass:

- Tile titles render in **Inter 600** (the "atelier" sans), descriptions in **Inter 400**.
- Profile heading "Business profile" renders in **Fraunces 600** at 28 px (the editorial serif — the most visible Atelier signal).
- Form inputs now have a floating label and a focus ring instead of a flat slab.
- Buttons are pill-shaped with Inter 600 labels and visibly bounce on press.
- Nav-bar titles ("Profile", "New Order", etc.) render in **Fraunces**.

## 2026-05-20 — Sign-in screen migrated

First screen on Atelier primitives end-to-end. `app/sign-in.tsx`:

- Wordmark "SeamFlow" → `<Text variant="display" tone="text">` → Fraunces 700 / 34 / 40.
- Subtitle "Tailor CRM" → `<Text variant="bodySm" tone="textMuted">`.
- Tab labels → `<Text variant="label">` (UPPERCASE, +0.4 tracking). Active tab marker uses `theme.colors.primary` directly.
- "Continue with Google" button → Atelier `<Button variant="secondary">`. Pill radius, hairline outline, scale-to-0.97 spring on press.
- "or with email" divider → uses `theme.colors.hairline` instead of legacy `colors.border`.
- Email + password inputs → Atelier `<Input>` with floating label + focus ring (replaces the flat slab `components/Input.tsx` on this screen only).
- Submit button → Atelier `<Button>`.

Behavior unchanged — `signInWithPassword` / `signUpWithPassword` / `signInWithGoogle` / `EmailNotConfirmedError` routing all intact. Per-screen test path: open → toggle tabs → focus email field (label floats up, focus ring appears) → submit; same for sign-up. Google flow opens the in-app browser as before.

Other screens still use the legacy `components/Button.tsx` and `components/Input.tsx` (which resolve to the new Atelier midnight palette via the theme shim, so they look subtly different — Fraunces is only visible on screens that have migrated). The legacy components will eventually be retired or rewritten as thin adapters once enough screens are on direct imports.

## 2026-05-20 — Foundation landed

**Tokens** in `@seamflow/ui`:

- `colors.ts` — `linen` (light) and `midnight` (dark) palettes, plus semantic token sets (`bg`, `surface`, `surfaceElevated`, `text`, `textMuted`, `primary`, `accent`, `success`, `warning`, `danger`, `hairline`, `border`, status-pill aliases). Token names stable across modes.
- `typography.ts` — Fraunces / Inter / JetBrains Mono with the 9-variant scale (`display` → `mono`).
- `spacing.ts` — 4 px scale (`none` → `4xl`).
- `radii.ts` — `none` → `pill`.
- `shadows.ts` — `linenShadows` (warm, derived from `ink`) and `midnightShadows` (minimal, surface elevation does the work).
- `motion.ts` — three springs (`soft` / `snappy` / `lazy`), three durations, one easing curve, press-feedback constants.
- `theme.ts` — `createTheme(mode)` factory, named `linenTheme` / `midnightTheme`, `toCssVariables(theme)` for future web consumption.

**Primitives** in `@seamflow/ui/components`:

- **`Text`** — `variant` × `tone` × `numeric` props. The single text primitive. Handles `textTransform` / `fontVariant` per-variant.
- **`Button`** — variants `primary` / `secondary` / `ghost` / `destructive`, sizes `sm` / `md` / `lg`. Scale-to-0.97 spring on press via Reanimated v3. Pill radius, icon slots, loading state, `fullWidth` default.
- **`Input`** — floating-label, hairline border, focus ring (animated opacity), `leading` / `trailing` slots, `error` and `helper` text. Replaces all `#ffffff15` slab styling.

**Theme provider** — `AtelierThemeProvider` with `mode` or pre-built `theme` prop. Lightweight; doesn't depend on Restyle context so the package works without app-side type augmentation.

**Mobile app integration:**

- `apps/seamflow-app/lib/theme.ts` rewired as a back-compat shim mapping the legacy `{ colors, spacing, radii }` API onto Atelier midnight tokens. Single-file change flips the visual identity for every screen still using the legacy import. Migration to direct primitive use happens screen-by-screen.
- `app/_layout.tsx` loads Fraunces / Inter / JetBrains Mono via `@expo-google-fonts/*` and gates render until fonts are available.
- `AtelierThemeProvider mode="midnight"` wraps the auth provider so every primitive can resolve `theme.colors.*`.

**Color mapping (legacy → Atelier midnight):**

| Legacy | Hex (old) | Atelier token | Hex (new) |
|---|---|---|---|
| `colors.bg` | `#0f0f10` | `bg` | `#10101A` |
| `colors.card` | `#1a1a1c` | `surface` | `#1A1A26` |
| `colors.cardElevated` | `#242427` | `surfaceElevated` | `#232333` |
| `colors.text` | `#f5f5f7` | `text` | `#F2F0EB` |
| `colors.textMuted` | `#9b9ba1` | `textMuted` | `#A5A3A0` |
| `colors.accent` | `#7c5cff` | `primary` | `#A89CFF` |
| `colors.accentText` | `#ffffff` | `textOnPrimary` | `#10101A` |
| `colors.danger` | `#ff5e57` | `danger` | `#E08B82` |
| `colors.success` | `#33d17a` | `success` | `#7FD9B8` |
| `colors.border` | `#2e2e32` | `border` | `#2F2F40` |

**Screens migrated to new primitives:** 0 — by design. Foundation only this pass. Screen migrations land in subsequent entries, one screen at a time, with before/after notes here.

**Coming next:** Card, Sheet, MeasurementInput, Chip, Avatar, ListRow primitives. After those, screen-by-screen migration starting with the home/welcome surface.
