# Atelier design system — changelog

Reverse-chronological. Entries land when a token / primitive / migration ships.

## 2026-05-30 — Runtime light/dark mode (linen ⇄ midnight)

The app can now switch themes at runtime. Atelier already shipped both palettes (`linen` light + `midnight` dark); this wires them to a user-facing toggle and makes every screen re-render reactively when the mode flips. Default behaviour is unchanged — first launch still resolves to midnight (the historical default) unless the OS reports a light scheme.

- **`lib/theme-mode.tsx` (new)** — `ThemeModeProvider` owns a `'system' | 'light' | 'dark'` preference, persists it to AsyncStorage (`seamflow.theme.preference`), and resolves it (applying `useColorScheme()` for `'system'`) to a concrete `ColorMode`. `useThemeMode()` exposes `{ preference, mode, setPreference, ready }`. `'system'` with an unknown/`'unspecified'` OS scheme falls back to dark.
- **`app/_layout.tsx`** — split into `RootLayout` (mounts `ThemeModeProvider`) + `ThemedRoot`, which feeds `mode` into `AtelierThemeProvider`, the pre-font splash, the `StatusBar` style, and the native Stack header/content colors via `semanticForMode(mode)`. No `key` on the Stack, so toggling re-themes without resetting navigation state.
- **`lib/theme.ts`** — added a reactive `useThemeColors()` hook that reads the live Atelier theme (`useAtelierTheme()`) and re-exposes it under the legacy key names (`bg`, `card`, `cardElevated`, `border`, `hairline`, `text`, `textMuted`, `accent`→primary, `accentText`→textOnPrimary, `danger`, `success`, `warning`). The static `colors` export remains only for non-reactive contexts. `radii`/`spacing` are mode-invariant and stay static imports.
- **Reactive sweep** — every shim-consuming screen moved its non-text colors out of module-level `StyleSheet.create` into inline styles driven by `useThemeColors()`, and its text onto `<Text variant tone>` (auto-reactive). Files: `Screen`, `OfflineBanner` (also tokenized a stray `#f5a524` → `warning`), `DateField`, `PinLockScreen`, `app/index`, `(app)/_layout`, `(app)/pin`, `(app)/new-order`, `(app)/groups/new`, `(app)/orders/[id]`, `clients/[id]`, `groups/[id]`, `templates/[id]`, `verify-otp`. `grep` confirms zero static `colors` importers remain under `app/`.
- **Toggle UI** — `app/(app)/me.tsx` (Business profile) gains an **Appearance** segmented control (System / Light / Dark) calling `setPreference(...)`; the active segment fills with the accent token.

Type-checks clean across `@seamflow/ui` and the app. Note: linen (light) has never been rendered on-device before — expect to tune contrast nits on first emulator pass.

## 2026-05-30 — Remaining list/detail/form screens migrated (typography sweep)

Final batch flipping the last screens that still rendered raw React Native `<Text>` (system font) onto the Atelier `<Text>` primitive. No hex literals were involved — this pass was purely typography (Fraunces/Inter) + dropping per-screen text color/size/weight in favor of variants + semantic tones.

- **Lists**: `groups/index.tsx`, `templates/index.tsx` — intro/empty/loading copy → `bodySm` muted; dropped the local `colors` import (Card adapter already carries surface tokens).
- **Details**: `groups/[id].tsx`, `templates/[id].tsx`, `clients/[id].tsx` — record name → `h1` (Fraunces), section headers → `h3` (Inter 600), all meta/empty lines → `bodySm` muted, the group "link to client" hint → `caption` muted. Member/measurement-set sub-cards already flowed through the `Card` adapter. Structural `divider` rules keep reading `colors.border` from the `lib/theme` shim (Atelier midnight *tokens*, not hex).
- **Form**: `templates/new.tsx` — "Measurement fields" heading → `h3`; removed the now-unused `colors` import (section style is layout-only).
- **Auth**: `verify-otp.tsx` — "Check your email" → `h1`, subtitle/back-link → `bodySm`/`caption` muted, the inline email emphasis → nested `bodySm` default-tone text; accent resend-link color stays on the `colors.accent` token.
- **PIN settings** (`pin.tsx`): prompts/headings → `h3`, helper copy → `bodySm` muted, keypad digits → `h2` `numeric`, Cancel → `bodySm` muted. Keypad surface/dot/accent colors remain token-based.

StyleSheets across all eight files trimmed to layout-only (margins, dividers, rows, keypad geometry); every `{ color, fontSize, fontWeight }` text block folded into a `<Text variant>` + `tone`. Type-checks clean across `@seamflow/ui` and the app; `grep` confirms zero raw-RN `Text` imports and zero `#rrggbb` literals remain anywhere under `app/`.

## 2026-05-29 — Order detail screen migrated

`app/(app)/orders/[id].tsx` fully migrated to Atelier primitives + tokens — the last screen carrying hardcoded hexes.

- Status pill → `<Chip variant="status" tone={STATUS_TONE[...]}>`. Deleted the `STATUS_COLOR` map that held the raw hexes `#f5a524` (testing) and `#e35d6a` (on_pause); status colors now resolve from the semantic `status*` tokens, same mapping as the orders list.
- All screen text → the `<Text>` primitive: order name → `h1` (Fraunces editorial heading, was system-sans 24/700); section headers (Status / Photos / Items / Timeline) → `h3`; ordered/delivery/notes + every empty state → `bodySm` muted; photo role/hint, timeline date/note → `caption` muted.
- Item cards already flipped to the Atelier `Card` via last pass's adapter — no change needed here.
- Structural colors (divider, timeline left-accent rule, photo thumb bg, upload spinner) stay on the `lib/theme` shim, which already resolves to Atelier midnight tokens — no raw hex remains anywhere on this screen.
- StyleSheet trimmed: removed `name` / `statusPill` / `statusText` / `muted` / `eventTitle` (folded into `Text` variants); remaining styles hold layout only (margins, the accent rule, photo strip).

Verified on the Pixel 9 Pro XL emulator (midnight theme): header + status chip, status-transition buttons, photos section, item card, and timeline with its accent rule all render correctly; Delete order stays `destructive`. Type-checks clean across `@seamflow/ui` and the app.

## 2026-05-30 — Order detail screen migrated

`app/(app)/orders/[id].tsx` — the biggest remaining offender — fully onto Atelier primitives. No raw `<Text>`, no hex literals, no `STATUS_COLOR` table.

- **Status pill** → `<Chip variant="status">` driven by the shared `STATUS_TONE` map (same tokens as the orders list). This deletes the old `STATUS_COLOR` record that hardcoded `#f5a524` (testing) and `#e35d6a` (on_pause) — those were the last raw hexes on this screen.
- **All text** → Atelier `<Text>`: order name → `h1` (Fraunces), section headers (Status / Photos / Items / Timeline) → `h3` (Inter 600), dates/notes/empty-states → `bodySm` muted, photo role/hint + timeline timestamps → `caption` muted (italic where the original was).
- **Item cards** already flow through the `Card` adapter (Inter title + measurement lines, soft radius).
- Structural colors (section dividers, timeline accent left-border, photo-thumb backgrounds, `ActivityIndicator` tints) still read from the `lib/theme` shim — those are Atelier midnight *tokens*, not hex, consistent with the other migrated screens.

Verified on the Pixel 9 Pro XL emulator: order name in Fraunces, neutral `REGISTERED` status chip, section headers in Inter, item card with measurements, timeline entry with the lavender accent border + muted timestamp, and the destructive "Delete order" pill all render correctly. Type-checks clean; `grep` confirms zero `#rrggbb` literals remain in the file.

## 2026-05-29 — `Card` primitive + adapter flip + clients list migrated

New `Card` surface primitive in `@seamflow/ui`, the legacy `components/Card.tsx` rewired as a thin adapter (flips all 11 card-using screens at once), and `app/(app)/clients/index.tsx` migrated to direct primitive imports.

- **`Card`** (`packages/ui/src/components/Card.tsx`) — padded, hairline-bordered surface at the soft card radius (`radii.l` = 20):
  - No `onPress` → static `View`. With `onPress` → interactive Pressable with the shared scale-to-0.97 press spring (`motion.press`), matching Button / Chip. Replaces the old `TouchableOpacity` + `activeOpacity` feel.
  - `variant="surface"` (default) / `"elevated"` (→ `surfaceElevated` bg, for cards-on-cards).
  - `CardTitle` → `<Text variant="h3">` (Inter 600 / 18); `CardLine` → `<Text variant="bodySm" tone="textMuted">` (14). Canonical text slots so callers never reach for a raw `<Text>`. All colors resolve from the theme — no hex.

- **`components/Card.tsx`** → thin adapter forwarding to the Atelier `Card`, preserving the list-item `marginBottom` that callers relied on. Net effect: every screen still importing the local `Card` (clients/orders/groups/templates lists + detail screens, new-order, etc. — 11 files) picks up Inter typography + soft radius + press spring with **zero per-screen changes**. Title font flips from system-sans 16/600 to Inter 600/18; card press now springs instead of fading.

- **`app/(app)/clients/index.tsx`** migrated: raw RN `<Text>` muted states → `<Text variant="bodySm" tone="textMuted">` from `@seamflow/ui`; dropped the hardcoded `colors` import. No raw colors remain on this screen.

Verified on the Pixel 9 Pro XL emulator (midnight theme): clients list renders the client card with the new soft radius, hairline border, and Inter title/subtitle. Type-checks clean across `@seamflow/ui` and the app.

`ListRow` (avatar + title + subtitle + chevron) deliberately **not** built this pass — it's a new visual pattern, not a token swap, so it needs design intent before it replaces the current bordered-card lists.

## 2026-05-29 — `Chip` primitive + orders list migrated

New `Chip` primitive in `@seamflow/ui`, and `app/(app)/orders/index.tsx` converted onto it (first list screen migrated end-to-end).

- **`Chip`** (`packages/ui/src/components/Chip.tsx`) — one pill shape, two jobs:
  - `variant="filter"` (default) — interactive, selectable. Outlined (`colors.border`) when idle, fills with `tone` when `selected`. Scale-to-0.97 spring on press (shared `motion.press` tokens). Used for the status / time filter rows.
  - `variant="status"` — display-only filled badge (non-interactive `View`). Used for the status pill on order cards.
  - `tone` is a semantic token name (`keyof SemanticColors`, e.g. `primary`, `danger`, `statusInProgress`) — never raw hex. Fill + idle border resolve from the theme, so chips re-skin with the mode.
  - Label always renders through `<Text variant="label">` (Inter 500, uppercase, +0.4 tracking) for both variants, matching the sign-in tab labels.

- **`app/(app)/orders/index.tsx`** migrated:
  - Removed the inline `Chip` function, the raw RN `<Text>`/`<Pressable>`, and the hardcoded `STATUS_COLOR` hexes (`#f5a524`, `#e35d6a`).
  - Added `STATUS_TONE: Record<OrderStatus, ChipTone>` mapping each status to its semantic token (`statusRegistered` … `statusDelivered`). Status badge on each card → `<Chip variant="status" tone={STATUS_TONE[...]} />`.
  - Filter rows → `<Chip>` (Overdue `tone="danger"`, Due this week `tone="primary"`). Title + loading/empty states → `<Text>` primitive.
  - **Layout fix:** the horizontal filter `ScrollView`s were growing vertically (flex column parent) and their `contentContainer` was stretching chips into tall bars. Constrained with `flexGrow: 0` on the scroll style + `alignItems: 'center'` on the content row → compact pills.

Verified on the Pixel 9 Pro XL emulator (midnight theme): filter rows render as uppercase pills, selecting a status fills it with its tone and refetches, status badges read correctly on cards. No hardcoded colors remain on this screen.

`Card` / `CardLine` / `CardTitle` on this screen are still the legacy wrappers — Card migration is a separate future pass.

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
