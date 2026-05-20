# SeamFlow — Design System Implementation Prompt

> Paste the contents below into Claude Code (from the repo root) when you're ready to start the redesign. This is a **refactor**, not a rebuild — the goal is to update the existing tailor app to wear the new visual identity, while extracting the design tokens and primitives into a shared package so future apps (`seamflow-client`, `seamflow-web`, `seamflow-admin`) inherit the same system automatically.

---

## The prompt

You are doing a visual-identity refresh on **SeamFlow**, a workflow platform for tailors and seamstresses. The repo is a pnpm + Turborepo monorepo. The only app with real code today is `apps/seamflow-app` (Expo / React Native) — its source lives in `apps/seamflow-app/src-legacy/` and its theme in `apps/seamflow-app/src-legacy/theme/`. Future apps in the system (`seamflow-client` consumer mobile, `seamflow-web` customer-facing Next.js, `seamflow-admin` internal dashboard) are scaffolded but empty.

**This is a refactor, not a rebuild.** Do not create a parallel app. Do not move screens into a new folder. Do not rewrite navigation from scratch. Keep the existing file structure, the existing screens, the existing context providers, the existing navigation — and replace the *visual layer* (theme tokens, primitive components, screen styling) in place. Same code, new skin, new feel.

The second goal is to extract the new visual identity into `packages/ui` so it lives as the single source of truth for the whole monorepo. When the web and consumer apps come online, they import the same tokens and primitives — no duplicated colors, no diverging fonts, no drift.

### Brand concept — "Atelier"

SeamFlow = seam (stitch, craft, precision line) + flow (motion, current, ease). The current UI feels rigid and generic (raw `#0000ff` primary on a cold dark grey, flat `#ffffff15` input slabs, chunky FontAwesome icons, no motion language). The new identity is **"Atelier"** — workshop-meets-boutique. Warm undertones everywhere. Editorial serif for titles, clean sans for UI, tabular mono for measurements. Springy motion. Tactile inputs. Soft shadows. The tailor app's default mode is dark ("Midnight"); the customer-facing surfaces will default to light ("Linen") later, sharing the same DNA.

### Step 1 — Stand up the design tokens in `packages/ui`

`packages/ui` is currently an empty scaffold. Make it the single source of truth. Every token below lives here and is consumed by `apps/seamflow-app` (and later by the other apps). No app may hard-code a color, font size, radius, spacing value, or shadow ever again.

Create:

- `packages/ui/src/tokens/colors.ts` — `linen` and `midnight` palettes.
- `packages/ui/src/tokens/typography.ts` — font families, scale, line-heights, letter-spacing.
- `packages/ui/src/tokens/spacing.ts` — 4px-based scale (`xs:4, s:8, m:12, l:16, xl:24, 2xl:32, 3xl:48, 4xl:64`).
- `packages/ui/src/tokens/radii.ts` — `none:0, xs:6, s:10, m:14, l:20, xl:24, 2xl:32, pill:9999`.
- `packages/ui/src/tokens/shadows.ts` — layered soft shadows.
- `packages/ui/src/tokens/motion.ts` — spring configs, durations, easing.
- `packages/ui/src/tokens/index.ts` — re-exports + a `createTheme()` factory that returns a Restyle-compatible theme for React Native today, and (set up but unused today) emits the same values as CSS custom properties + a Tailwind preset for the future web apps.

**Colors — exact values:**

```
Light ("Linen")
  linen     #FAF7F2   base
  paper     #F1ECE3   card surface
  clay      #D9C6AE   warm neutral chip / divider
  ink       #1A1714   primary text (warm near-black, never #000)
  inkMuted  #5B554F   secondary text
  indigo    #2E3A8C   primary (dyed-thread indigo)
  indigoSoft#5764B8   hover / focus tint
  copper    #C97B5C   accent / warm pop
  sage      #8FA68E   secondary, success
  rose      #B4564B   error / destructive
  amber     #D89F4A   warning
  hairline  rgba(26,23,20,0.08)

Dark ("Midnight")
  midnight  #10101A   base
  surface   #1A1A26   card surface
  surface2  #232333   elevated card
  cream     #F2F0EB   primary text (warm white, never #FFF)
  creamMuted#A5A3A0   secondary text
  lavender  #A89CFF   primary (silk)
  lavSoft   #877BD9   hover / focus tint
  peach     #E6B796   accent / warm pop
  mint      #7FD9B8   success
  rose      #E08B82   error / destructive
  amber     #E8B96A   warning
  hairline  rgba(242,240,235,0.08)
```

No pure black, no pure white, no RGB-pure primaries anywhere — kill the existing `#0000ff` on sight.

**Typography:**

- **Display:** `Fraunces` (variable) — screen titles, hero headlines.
- **UI / body:** `Inter` (variable) — labels, body, buttons, navigation.
- **Numeric:** `JetBrains Mono` with `font-variant-numeric: tabular-nums` — **only** for measurement values, prices, and stat displays.

Add `@expo-google-fonts/fraunces`, `@expo-google-fonts/inter`, `@expo-google-fonts/jetbrains-mono` to `apps/seamflow-app`, load them via `useFonts` at the app root, and gate render until loaded. Replace every Poppins reference in `src-legacy/theme/textVariants.ts` and elsewhere.

Type scale (mobile):

```
display    Fraunces 700, 34/40, -0.5
h1         Fraunces 600, 28/34, -0.25
h2         Fraunces 600, 22/28
h3         Inter    600, 18/24
body       Inter    400, 16/24
bodySm     Inter    400, 14/20
label      Inter    500, 12/16, +0.4
caption    Inter    400, 12/16
button     Inter    600, 15/20, +0.1
mono       JetBrainsMono 500, 16/22, tabular
```

**Shadows (light mode):**

```
sm:  0 1px 2px  rgba(26,23,20,0.04)
md:  0 4px 12px rgba(26,23,20,0.06)
lg:  0 12px 32px rgba(26,23,20,0.08)
xl:  0 24px 56px rgba(26,23,20,0.10)
```

Dark mode shadows are minimal — rely on `surface` vs `surface2` for elevation.

**Motion:**

```
spring.soft   { damping: 18, stiffness: 180, mass: 0.9 }
spring.snappy { damping: 22, stiffness: 260, mass: 0.8 }
spring.lazy   { damping: 26, stiffness: 120 }
duration.fast 150ms
duration.base 220ms
duration.slow 320ms
ease.standard cubic-bezier(0.22, 1, 0.36, 1)
```

Spring everywhere. Never linear. Buttons scale to `0.97` on press. Sheets enter on `spring.snappy`. Page transitions are slide + fade + `0.98→1.0` scale.

### Step 2 — Build the shared primitives in `packages/ui`

Implement these as React Native components today, with file-header comments noting how each will render on web later (e.g. `// Web: <button class="btn btn-primary">`). Build on top of `@shopify/restyle` since the app already uses it.

1. **Text** — `variant` (type-scale name), `tone` (token name), `numeric` (switches to mono + tabular figures).
2. **Button** — variants `primary` / `secondary` / `ghost` / `destructive`. Sizes `sm/md/lg`. Pill radius. Scale-to-0.97 on press, light haptic.
3. **Input** — **floating-label**, 14px radius, 1px hairline border, focus ring is a 2px inner glow in primary at 30% opacity. Trailing icon slot. Error caption slides in below. Replaces every flat `#ffffff15` slab in the legacy code.
4. **Card** — 20px radius, `paper` / `surface` fill, `shadows.md`. Optional pressable variant.
5. **Sheet** — bottom sheet with rounded top corners, grab handle, springy enter/exit. Replaces every full-screen modal in the legacy code (e.g. `ClientDetails`).
6. **Stepper** — incremental numeric input.
7. **MeasurementInput** — the signature interaction. Horizontal scrollable ruler with tick marks (inches and centimeters, toggle), current value displayed large in `JetBrainsMono`, haptic tick on each unit. This replaces every plain numeric `TextInput` in the measurements table. Invest in it.
8. **Chip** — pill, small, for status (`In progress`, `Fitting due`, `Paid`).
9. **Avatar** — circle with initials fallback tinted in copper/peach.
10. **EmptyState** — illustration slot + title + body + CTA.
11. **StitchLine** — a thin animated SVG line that "sews" across on success. Brand signature — used sparingly (one occurrence per success state, not as decoration).
12. **ListRow** — avatar + title + subtitle + trailing chip. Press = spring scale + sheet open. Replaces the hand-rolled client/order cards.
13. **TabBar / NavBar** — only if the existing navigation needs visual updates; otherwise restyle the existing one in place.

Every primitive is theme-aware (light/dark), accessible (hit slop, contrast, `accessibilityLabel`, dynamic type respect), and animated with `react-native-reanimated` v3 worklets.

Replace `react-native-vector-icons/FontAwesome5` everywhere with **`phosphor-react-native`** (duotone or regular, 1.5px stroke). Add a small set of bespoke SVG icons for tailoring concepts (measuring tape, dress form, scissors, thread spool, swatch, mannequin) in `packages/ui/src/icons/` at the same weight.

### Step 3 — Refactor `apps/seamflow-app` in place

Do **not** create a parallel `src/`. Work inside `apps/seamflow-app/src-legacy/`. (If preferred, rename it to `src/` at the very end as a single, atomic commit — but keep all imports working throughout.)

The refactor flow for each existing file:

- **Theme files (`src-legacy/theme/colors.ts`, `font.ts`, `index.ts`, `textVariants.ts`):** delete the bodies, re-export from `@seamflow/ui` (i.e. `packages/ui`). Keep the export names the same wherever practical so imports across the app don't break — but `colors.primary = '#0000ff'` is gone and stays gone. Map any legacy color name still in use to the closest new token (e.g. legacy `primary` becomes `lavender`, legacy `accent` becomes `peach`, legacy `subText` becomes `creamMuted`).
- **Screens:** edit each file in place. Replace inline `StyleSheet.create` color/font/radius literals with calls into the new tokens via Restyle props. Replace raw `<TextInput>` with the new `Input` component. Replace raw `<Text>` with the new `Text` component (variant + tone). Replace hand-rolled cards with `Card`. Replace the legacy `ClientDetails` modal pattern with `Sheet`. Keep navigation calls (`navigation.navigate(...)`), context usage (`useApp`, `useClients`), and data flow exactly as-is.
- **Components (`src-legacy/components/*`):** same approach — swap visuals, keep behavior. `addNewOrder.tsx`, `clientDetails.tsx`, `SafeAreaWrapper.tsx` get restyled but keep their props and exports.

**Screens to refactor, in order. After each one, stop and show me before/after screenshots before continuing.**

1. **Welcome.tsx** — `Fraunces` "SeamFlow" wordmark fading in, `StitchLine` drawing under it, warm midnight background. Same 3-second timer + navigation behavior.
2. **Home.tsx** — replace the four hard 180×180 tiles. New layout: `Fraunces` greeting using `companyInfo.name` from `useApp()`, a "Today" `Card` (placeholder for fittings + deliveries due — wire later), a horizontal row of soft circular quick-action buttons (New order, My clients, My designs, Calendar) with phosphor icons, then a "Recent activity" `ListRow` list. Same navigation targets.
3. **MyClients.tsx** — keep the `useClients` hook, the `useMemo` filter, the `FlatList`. Swap the search `TextInput` for the new `Input`. Swap `clientCard` for `ListRow`. Swap the `ClientDetails` modal for the new `Sheet`. Keep `handleClientPress`, `handleAddNewOrder` behavior.
4. **newOrder.tsx** — keep `formData` state, `handleSubmit`, `handleDateChange`. Wrap sections in `Card`. Replace every `TextInput` with `Input`. Replace the entire measurements table — every `MeasurementInput` (the local component) becomes the new shared `MeasurementInput` from `packages/ui`. Replace the date `TouchableOpacity` with a styled `Input`-shaped trigger that opens the native picker in a `Sheet` on iOS. On submit, fire the `StitchLine` success microinteraction, then haptic, then navigate.
5. **clientDetails.tsx (component)** — convert from modal to `Sheet`. Render measurements in `JetBrainsMono` via `<Text numeric>`. Order history becomes a vertical timeline.
6. **enterDetails.tsx, Login.tsx, MyDesigns.tsx, addNewOrder.tsx** — same playbook: keep behavior, swap visuals.

Default mode for the tailor app: **dark (Midnight)**. Add a settings toggle for light mode but don't block on it.

### Step 4 — Make `packages/ui` ready for the future apps now

Even though `seamflow-client`, `seamflow-web`, and `seamflow-admin` are empty, set `packages/ui` up so they can consume it the day they're scaffolded:

- Export tokens as **both** a Restyle theme object (RN) **and** CSS custom properties + a Tailwind preset (web). Same names on both platforms.
- In each primitive's file header, note the intended web rendering (e.g. `// Web: <button>` with corresponding classes).
- Write `packages/ui/README.md` with token reference, light/dark swatches, component list, and import examples for RN and Next.
- Write `docs/design-system.md` with the Atelier brand concept, full color/type/motion spec, and a "how to add a new component" section.

Light mode ("Linen") is the default for the future customer web; dark mode ("Midnight") stays default for the tailor mobile app. Both are first-class.

### Constraints — non-negotiable

- This is a refactor. Do not create `apps/seamflow-app/src/` as a parallel structure. Work in place.
- Keep all existing navigation, context, data, and screen-to-screen flow intact. Only the visual layer changes.
- Delete `#0000ff`. Delete every Poppins reference. Delete every FontAwesome5 import. Delete every `#ffffff15` raw color in a style block.
- No pure black, no pure white anywhere. Text is `ink` or `cream`. Backgrounds are `linen` or `midnight`.
- No flat `TextInput` styling anywhere — always the new `Input`.
- No full-screen modals for ephemeral UI — always `Sheet`.
- No hard-coded hex / font size / radius / spacing values in any app file. Tokens only, via `packages/ui`.
- No linear easing. Spring everywhere, or `ease.standard` as fallback.
- Use the `StitchLine` rarely. It's a signature, not a decoration.

### Verification

After each screen is refactored:

1. Run on iOS and Android simulators. Capture screenshots in dark (and light, if toggled) mode. Save to `docs/screenshots/`.
2. Diff the file against the original `src-legacy/` version (git diff is fine) and confirm every legacy color, font, and radius literal has been replaced by a token import.
3. Confirm the screen's behavior is unchanged — same data flow, same navigation, same context usage.
4. Run `pnpm lint` and `pnpm build` at the repo root — both must pass.
5. Add a short entry to `docs/design-system/CHANGELOG.md` noting what was migrated.

### Working style

- Start with Step 1 (tokens in `packages/ui`). Do not touch any app screen until tokens and the first three primitives (`Text`, `Button`, `Input`) exist and the app still compiles after a partial rewire of `src-legacy/theme/index.ts` to re-export from `@seamflow/ui`.
- After each anchor screen, stop and show me before/after screenshots and a short diff summary before moving to the next.
- If you hit a decision point not covered here (exact chip hover state, exact list stagger), pick something consistent with the rest of the system, note it in the changelog, and move on.
- Treat `packages/ui` like a real published library — clean exports, strong TypeScript types, no app-specific logic.
