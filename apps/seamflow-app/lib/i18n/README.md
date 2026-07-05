# Internationalization (i18n)

**Rule: every user-facing string in this app must go through `t()`. No exceptions.**

Any new screen, component, alert, button, label, placeholder, or empty state must
be translated when it's added — not "later". This is enforced automatically (see
"The guard" below), so untranslated strings will fail `npm run lint`.

## How it works

- `LanguageProvider` (in `index.tsx`) is mounted at the app root. It picks the
  device language on first launch, persists the user's choice to AsyncStorage,
  and exposes `useTranslation()`.
- Strings live in `locales/<area>.ts`, one file per area (`home`, `clients`,
  `orders`, `groups`, `templates`, `designs`, `misc`, `settings`, `auth`, plus
  shared `common`). Each exports `{ en: {...}, fr: {...} }` with **identical
  keys** in both languages. `strings.ts` merges them.
- Missing keys fall back to English, then to the raw key.

## Adding a string (the whole checklist)

1. Add the key to the right `locales/<area>.ts` file, in **both** `en` and `fr`.
   Keys are camelCase. Reference it as `t('area.key')`.
2. In the component: `import { useTranslation } from '<rel>/lib/i18n';` then
   `const { t } = useTranslation();` and use `t('area.key')`.
3. Generic actions (Save, Cancel, Delete, Error, Loading…) already live in
   `common` — use `t('common.save')` instead of duplicating.
4. Dynamic values use `{placeholders}`:
   `sentToDevices: 'Sent to {count} device(s).'` → `t('settings.sentToDevices', { count })`.
5. Enum-driven labels (order status, etc.): keep the enum value as data, build
   the key at render — `t('orders.status_' + status)` — and add
   `status_<value>` keys. Never send translated text to the API.

## The guard

`npm run i18n:check` (also runs inside `npm run lint`) fails when:

- a `t('area.key')` references a key missing from its locale file,
- an area's `en` / `fr` key sets don't match,
- a raw user-facing string is hardcoded (`label=`/`placeholder=`/`title=` with a
  literal, or `Alert.alert('literal'…)`).

Escape hatch: add `i18n-ignore` in a comment on the same line for a genuinely
non-UI literal.

## Adding a language

1. Add its block to every `locales/*.ts` file (copy the `en` shape, translate).
2. Register it in `strings.ts` (`translations`) and `LANGUAGES`.
3. Add the code to `LanguageCode`. Run `npm run i18n:check`.
   (Arabic/Urdu will also need an RTL layout pass.)

## Note on the stack

This is a lightweight, zero-dependency translator (no `i18next`). Call sites are
just `t('...')`, so if we ever need ICU/pluralization we can graduate to i18next
without touching screens.
