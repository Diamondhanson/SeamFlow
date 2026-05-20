# SeamFlow design system — "Atelier"

This document describes the **why** behind the visual identity. Token reference and primitive usage live in [`packages/ui/README.md`](../packages/ui/README.md).

## Brand concept

SeamFlow = **seam** (stitch, craft, precision) + **flow** (motion, current, ease).

The product sits at the intersection of:

- a tailor's workshop — tactile materials, warm light, hand tools, precision marks
- a small boutique — editorial type, soft shadows, considered spacing
- modern software — instant feedback, springy motion, no ceremony

"Atelier" is the name we use internally for this aesthetic. Avoid using the word in user-facing copy — it should land as a feeling, not a tagline.

## Modes

Two modes share the same token names and motion language. Applications swap between them at the theme-provider level — no application code branches on mode.

- **Linen** — light. Warm cream paper, dyed-thread indigo primary, copper accents. Default for customer-facing surfaces (`seamflow-web`, `seamflow-client`).
- **Midnight** — dark. Warm near-black, silk lavender primary, peach accents. Default for the tailor app (`seamflow-app`).

## Hard rules

These exist to prevent drift over time. They are checked manually during PR review until a lint rule lands.

1. **No pure black, no pure white.** Text is `text` (warm near-black or warm white). Backgrounds are `bg`. Anywhere a raw `#000000` or `#FFFFFF` shows up in app code is a bug.
2. **No RGB-pure primaries.** Primary is `#2E3A8C` (linen) or `#A89CFF` (midnight). Never `#0000ff` or `#FF0000`.
3. **No hard-coded color / font / radius / spacing in app screens.** Everything comes from `@seamflow/ui` tokens. If a screen needs a value the tokens don't cover, the token system is wrong — add the token, don't bypass it.
4. **No flat `TextInput` styling.** Always the `Input` primitive. No `#ffffff15` slabs.
5. **No full-screen modals for ephemeral UI.** Always `Sheet`.
6. **No linear easing.** Springs are the default. `ease.standard` is the only acceptable timing curve as a fallback.
7. **`StitchLine` is a signature, not decoration.** One occurrence per success state — not a divider.

## Type system

Three families, three roles.

- **Fraunces** (variable serif) — screen titles, the wordmark, hero headlines. Signals craft.
- **Inter** (variable sans) — body, labels, buttons, navigation. The workhorse.
- **JetBrains Mono** with `tabular-nums` — measurement values, prices, stat displays. The mono family is reserved for numerics so chest / waist / hips stack vertically with the digits aligning regardless of value. Application code uses `<Text numeric>` rather than reaching for the family directly.

## Motion system

Three springs, three timings, one easing curve. See [`packages/ui/src/tokens/motion.ts`](../packages/ui/src/tokens/motion.ts).

Defaults:

- Buttons / press feedback → `springs.snappy` + `scaleTo: 0.97`.
- Page transitions, sheets entering → `springs.soft`.
- Large decorative reveals (StitchLine) → `springs.lazy`.

If you need a timing-based animation (e.g. a progress bar), pull `easing.standardBezier` into `Easing.bezier(...)`. Never use `Easing.linear` or pull a bespoke cubic-bezier from a designer's animation tool.

## Iconography

- **General icons** — `phosphor-react-native` (duotone or regular, 1.5 px stroke). Not yet installed; pull in when the first screen needs a non-trivial icon.
- **Tailoring-specific icons** — bespoke SVG in `packages/ui/src/icons/` (measuring tape, dress form, scissors, thread spool, swatch, mannequin). Drawn at the same 1.5 px stroke as phosphor so the families read consistently.

## Adding a new component

See [`packages/ui/README.md#adding-a-new-primitive`](../packages/ui/README.md#adding-a-new-primitive).

## Migration notes

The mobile app is mid-migration from a flat dark UI (raw `#0000ff` primary, FontAwesome5 icons, Poppins font) to Atelier. The legacy code lives in `apps/seamflow-app/src-legacy/` (gitignored). The active code in `apps/seamflow-app/app/`, `lib/`, `components/` is being migrated screen-by-screen — see `docs/design-system/CHANGELOG.md` for status.

`apps/seamflow-app/lib/theme.ts` is a back-compat shim that maps the legacy `{ colors, spacing, radii }` API onto Atelier tokens. As screens migrate to the new primitives, their direct imports from this file disappear; once no screen uses it, the file goes too.
