# SeamFlow — working notes for contributors & AI assistants

Conventions that must hold for every change in this repo. Read before editing.

## Internationalization is mandatory

**Every user-facing string in the mobile app (`apps/seamflow-app`) must go
through the translation function `t()` and have both English and French values.
Never hardcode display text.**

This applies to anything a tailor can read: screen titles, button labels, input
labels/placeholders, `Alert.alert(...)` titles and messages, empty states,
helper/hint text, chips, and status labels.

When you add or change UI:

1. Add the key to the correct file in `apps/seamflow-app/lib/i18n/locales/<area>.ts`,
   in **both** `en` and `fr` (identical key sets, camelCase keys).
2. Use it via `const { t } = useTranslation();` → `t('area.key')`.
   Import `useTranslation` from the app's `lib/i18n`.
3. Reuse `common.*` for generic actions (save, cancel, delete, error, loading…).
4. Interpolate with `{placeholders}`: `t('area.key', { count })`.
5. For enum labels (e.g. order status) build the key at render
   (`t('orders.status_' + status)`) — keep the raw enum value as data; never
   send translated text to the API.

Full guide: `apps/seamflow-app/lib/i18n/README.md`.

### Enforcement

`apps/seamflow-app` runs an i18n guard as part of `npm run lint` (and directly
via `npm run i18n:check`). It fails the build when a key is missing, when `en`/`fr`
key sets diverge, or when a raw user-facing string is hardcoded. Do not merge
with this check failing. Escape hatch for a genuinely non-UI literal: add an
`i18n-ignore` comment on that line.

## Other notes

- Shared types live in `packages/schemas`; the typed API client in
  `packages/api-client`. After changing either, rebuild them
  (`pnpm --filter @seamflow/schemas build`, `pnpm --filter @seamflow/api-client build`)
  so the API and app pick up the new contracts.
- Roadmap and feature plans: `docs/ROADMAP.md`,
  `docs/design-studio-moodboard-plan.md`.
