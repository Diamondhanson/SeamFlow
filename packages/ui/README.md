# @seamflow/ui — Atelier design system

Tokens and primitives for every SeamFlow surface. The same library powers the tailor mobile app today and the customer-facing apps when they come online.

## Brand concept — "Atelier"

SeamFlow = **seam** (stitch, craft, precision) + **flow** (motion, current, ease). The visual identity is workshop-meets-boutique. Warm undertones, editorial serif for titles, clean sans for UI, tabular mono for measurements. Springy motion. Tactile inputs. Soft shadows.

Two modes, same DNA:

- **Linen** — light mode. Default for `seamflow-web`, `seamflow-client`.
- **Midnight** — dark mode. Default for `seamflow-app` (tailor).

## Token reference

### Colors — Linen (light)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAF7F2` | Page background |
| `surface` | `#F1ECE3` | Card fill |
| `surfaceElevated` | `#E9E2D3` | Elevated card |
| `text` | `#1A1714` | Primary text (warm near-black) |
| `textMuted` | `#5B554F` | Secondary text |
| `primary` | `#2E3A8C` | Primary action (dyed-thread indigo) |
| `accent` | `#C97B5C` | Warm pop (copper) |
| `success` | `#8FA68E` | Success (sage) |
| `warning` | `#D89F4A` | Warning (amber) |
| `danger` | `#B4564B` | Destructive (rose) |
| `border` | `#D9C6AE` | Hairline / chip neutral (clay) |

### Colors — Midnight (dark)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#10101A` | Page background |
| `surface` | `#1A1A26` | Card fill |
| `surfaceElevated` | `#232333` | Elevated card |
| `text` | `#F2F0EB` | Primary text (warm white) |
| `textMuted` | `#A5A3A0` | Secondary text |
| `primary` | `#A89CFF` | Primary action (silk lavender) |
| `accent` | `#E6B796` | Warm pop (peach) |
| `success` | `#7FD9B8` | Success (mint) |
| `warning` | `#E8B96A` | Warning (amber) |
| `danger` | `#E08B82` | Destructive (rose) |

**Hard rules:** no pure black, no pure white, no RGB-pure primaries. Text is `text` or its muted variant. Backgrounds are `bg` or one of the surfaces.

### Typography

| Variant | Family | Size / Line | Notes |
|---|---|---|---|
| `display` | Fraunces 700 | 34 / 40 | Hero / wordmark |
| `h1` | Fraunces 600 | 28 / 34 | Screen titles |
| `h2` | Fraunces 600 | 22 / 28 | Section titles |
| `h3` | Inter 600 | 18 / 24 | Subsection |
| `body` | Inter 400 | 16 / 24 | Body |
| `bodySm` | Inter 400 | 14 / 20 | Compact body |
| `label` | Inter 500 | 12 / 16 | UPPERCASE, +0.4 tracking |
| `caption` | Inter 400 | 12 / 16 | Helper text |
| `button` | Inter 600 | 15 / 20 | Button labels |
| `mono` | JetBrains Mono | 16 / 22 | Tabular numerals — measurements, prices |

### Spacing — 4 px scale

`none(0) · xs(4) · s(8) · m(12) · l(16) · xl(24) · 2xl(32) · 3xl(48) · 4xl(64)`

### Radii

`none(0) · xs(6) · s(10) · m(14) · l(20) · xl(24) · 2xl(32) · pill(9999)`

### Motion

Springs are the default. Never linear.

| Spring | Damping | Stiffness | Mass | Use |
|---|---|---|---|---|
| `soft` | 18 | 180 | 0.9 | Page transitions, sheets |
| `snappy` | 22 | 260 | 0.8 | Buttons, toggles |
| `lazy` | 26 | 120 | 1.0 | Large reveals, StitchLine |

`durations.fast=150 · base=220 · slow=320` (ms) · `easing.standard = cubic-bezier(0.22, 1, 0.36, 1)`

Press feedback: `scaleTo: 0.97` with `springs.snappy`.

## Usage

### React Native (Expo)

```tsx
import { AtelierThemeProvider, Text, Button, Input } from '@seamflow/ui';

export default function App() {
  return (
    <AtelierThemeProvider mode="midnight">
      <Text variant="h1">Welcome to SeamFlow</Text>
      <Text variant="body" tone="textMuted">Sign in to continue</Text>
      <Input label="Email" />
      <Button label="Continue" variant="primary" />
    </AtelierThemeProvider>
  );
}
```

### Web (Next.js, future)

```tsx
import { linenTheme, toCssVariables } from '@seamflow/ui';

const vars = toCssVariables(linenTheme);
// inject vars into <html style={vars}> or pipe into a Tailwind preset
```

## Primitives

### Available today

- **Text** — `variant` × `tone` × `numeric`. The single text primitive — no raw `<Text>` in screen code.
- **Button** — `primary` / `secondary` / `ghost` / `destructive`, sizes `sm` / `md` / `lg`. Scale-to-0.97 spring on press.
- **Input** — floating-label text input, hairline border, focus ring, trailing / leading slots, error caption.

### Coming next

Card · Sheet · Stepper · MeasurementInput · Chip · Avatar · EmptyState · StitchLine · ListRow · TabBar.

## Adding a new primitive

1. Create `src/components/<Name>.tsx`.
2. Use `useAtelierTheme()` for tokens — no hard-coded hex / font / radius / spacing.
3. Use `react-native-reanimated` springs from `tokens/motion.ts` for any animation.
4. Add a file-header comment with the planned web rendering (which element + Tailwind classes).
5. Export from `src/components/index.ts`.
6. Add to "Available today" above.
7. Add an entry to `docs/design-system/CHANGELOG.md`.
