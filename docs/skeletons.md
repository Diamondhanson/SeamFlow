# Skeleton loaders

Every data-loading screen in `apps/seamflow-app` shows a **skeleton** — a
placeholder that mirrors the real layout — while its data loads, instead of a
"Loading…" line or a lone spinner. This keeps the app feeling instant and
prevents layout jump when the content arrives.

This is a hard convention (see `CLAUDE.md` → "Skeleton loaders are mandatory").

## The rule

- **Every screen whose first paint depends on a query/fetch needs a skeleton.**
  Lists, detail screens, editors, the calendar day list, settings/preferences.
- **The skeleton must match the loaded layout** — same frame (`<Screen>` +
  `<ScreenHeader>`), same row/card shape, same spacing.
- **When you change a screen's design, update its skeleton in the same change.**
- Screens that render instantly from local state/props (pure `*/new.tsx` forms,
  the home dashboard tiles) are exempt — there's nothing to wait for.

## The toolkit — `components/Skeleton.tsx`

Theme-aware and reduced-motion-aware (opacity pulse; static when the OS
"reduce motion" setting is on). All blocks re-color automatically in
Linen/Midnight. Import from `../components/Skeleton` (path depth varies).

### Base blocks

| Component | Use |
| --- | --- |
| `<Skeleton width height radius fill style />` | Raw rectangle. `fill` stretches to the parent (for aspect-ratio cells). |
| `<SkeletonLine width height />` | A text-line placeholder (pill radius). |
| `<SkeletonCircle size />` | An avatar placeholder. |

### Composed layouts

| Component | Matches | Props |
| --- | --- | --- |
| `<SkeletonList />` | A list of `<ListRow>` / `<OrderCard>` / member rows | `count=6`, `leading='square'\|'circle'\|'none'`, `lines=2`, `chip=false` |
| `<SkeletonDetail />` | A detail screen (hero card + sections) | `sections=2` |
| `<SkeletonForm />` | A form / editor (input fields + button) | `fields=5` |
| `<SkeletonGrid />` | A square image grid (Design Studio, photo grids) | `count=9`, `columns=3` |

### Picking the right one

- **List of rows with a thumbnail/icon** (templates, invoices, fabrics) →
  `<SkeletonList leading="square" />`
- **List of rows with an avatar** (clients, orders, calendar day) →
  `<SkeletonList leading="circle" chip />` (add `chip` if rows show a status pill)
- **List of cards with a status pill, no avatar** (group orders) →
  `<SkeletonList leading="none" chip />`
- **Detail screen** (order/client/group detail) → `<SkeletonDetail />`
- **Form / editor** (fabric, template, invoice editor, settings) →
  `<SkeletonForm fields={n} />`
- **Image grid** (designs) → `<SkeletonGrid />`

## How to wire a screen

Render the skeleton in the loading branch, inside the same frame as the loaded
screen. Two shapes:

**List screen** (skeleton replaces the FlatList, keep the header + list padding):

```tsx
{isLoading && items.length === 0 ? (
  <View style={styles.skeletonWrap}>{/* paddingHorizontal: spacing.lg */}
    <SkeletonList leading="circle" chip />
  </View>
) : (
  <FlatList … />
)}
```

**Detail screen** (early return keeps `<Screen>` + `<ScreenHeader>`):

```tsx
if (isLoading || !order) {
  return (
    <Screen>
      <ScreenHeader title={t('orders.detailTitle')} />
      <SkeletonDetail />
    </Screen>
  );
}
```

## Extending the toolkit

If a new screen has a shape none of the composed helpers fit, compose the base
blocks (`Skeleton` / `SkeletonLine` / `SkeletonCircle`) into a small local
skeleton, or add a new `Skeleton*` helper to `components/Skeleton.tsx` if the
shape will recur. Keep new helpers theme- and motion-aware by building them out
of the base `<Skeleton>` (don't hardcode colors or animations).

## Where skeletons are wired today

Lists: orders, clients, groups, templates, invoices, fabrics, designs, calendar
(day list). Details: orders, clients, groups, templates, invoices, fabrics.
Forms/settings: notification preferences, profile (`me`). Home tiles render
instantly and are intentionally exempt.
