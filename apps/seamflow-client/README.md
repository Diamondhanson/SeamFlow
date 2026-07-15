# seamflow-client

Consumer-facing mobile app for clients of SeamFlow tailors. Built around the
"style locker" idea: one place where every client's measurements, past garments,
moodboards, and tailor relationships live — portable across tailors via QR/share
links.

Distinct from `seamflow-app` (the tailor business app) and `seamflow-web` (the
magic-link order view that runs in the browser).

## Status

**Scaffolded.** The project now has the same production foundation as the tailor
app (`seamflow-app`): offline-first data, secure auth, PIN lock, push wiring,
theming, i18n, and the dialog system — see below. Feature screens are next.

## Stack & foundation (mirrors seamflow-app)

- **Expo SDK 55 / React Native 0.83 / Expo Router** — file-based routing.
- **Offline-first:** TanStack Query + AsyncStorage persister + NetInfo, with a
  crash-safe paused-mutation queue (`lib/query-client.ts`, `lib/mutation-defaults.ts`).
- **Auth:** Supabase (`lib/supabase.ts` — session in the OS keychain via
  expo-secure-store, PKCE), shared `lib/auth-context.tsx` (email + OTP, Google,
  Apple-ready, password reset).
- **API:** shared `@seamflow/api-client` with per-request JWT injection (`lib/api.ts`).
- **Security:** 4-digit PIN lock, HMAC-SHA-256 + per-install salt, 5-attempt
  lockout, 5-min background re-lock (`lib/pin-lock.ts`, `lib/lock-context.tsx`).
- **Push:** expo-notifications register/unregister + deep-link tap (`lib/notifications.ts`).
- **Theme:** the Atelier design system from `@seamflow/ui`, identical to the
  tailor app **except the primary colour is warm rose-pink** instead of indigo
  (`lib/client-theme.ts`). Light (linen) default, runtime light/dark.
- **i18n:** EN/FR through `lib/i18n` with the build-time `i18n:check` guard.
- **Dialogs:** the centered `useDialog()` system (native `Alert` banned by ESLint).

## Run

```
cp .env.example .env   # fill Supabase URL + anon key (shared backend)
pnpm --filter seamflow-client start
# native dev client required (has native modules): pnpm --filter seamflow-client android
```

## Before building for a device (owner setup)

See the exact list in `/docs/ROADMAP.md` → "Build status — seamflow-client". In short:

1. `eas init` here → paste `projectId` into `app.json` (replaces `REPLACE_WITH_EAS_PROJECT_ID`).
2. **Push:** the token needs the EAS projectId above. For **Android**, add a Firebase
   Android app for `com.bambothanson.seamflowclient`, drop its `google-services.json`
   into this folder, and add `"googleServicesFile": "./google-services.json"` under
   `android` in `app.json`. For **iOS**, Apple Developer Program → APNs key via
   `eas credentials`. (Push only works in a real dev/prod build, not Expo Go.)
3. Real brand icons/splash in `assets/images/`.

Reserved for **Phase 3** of the roadmap; see `/docs/ROADMAP.md` Appendix A for
the full consumer feature list.
