# Sign in with Apple — activation checklist

The code and config for Apple Sign-In are **already wired**. Everything below is
inert until the master switch is flipped:

- Switch: `APPLE_SIGN_IN_ENABLED` in
  [`apps/seamflow-app/lib/auth-context.tsx`](../apps/seamflow-app/lib/auth-context.tsx)
  (currently `false`).
- While `false`, the "Continue with Apple" button on the sign-in screen shows a
  "coming soon" dialog and never touches the native module — safe to ship on the
  current dev client without a rebuild.

The native flow (`signInWithApple`) is fully implemented: native
`expo-apple-authentication` sheet → identity token → Supabase
`signInWithIdToken({ provider: 'apple' })`, with a SHA-256 nonce. The API needs
**no changes** — `SupabaseAuthGuard` validates any Supabase JWT regardless of
provider, and the `handle_new_auth_user` DB trigger provisions the
`public.users` row for every provider.

## Prerequisite

**Apple Developer Program membership — $99/year.** Nothing below can be created
without it.

## 1. Apple Developer portal (developer.apple.com)

1. **App ID** — identifier `com.bambothanson.FashionApp` (must match
   `ios.bundleIdentifier` in `apps/seamflow-app/app.json`). Enable the
   **Sign in with Apple** capability on it.
2. **Services ID** — a *separate* identifier (e.g. `com.bambothanson.FashionApp.web`).
   This is the OAuth `client_id` Supabase uses for the web/token flow.
   - Configure its **Return URL**:
     `https://aqsppiyiegzatnjvjgyp.supabase.co/auth/v1/callback`
3. **Sign in with Apple Key (.p8)** — create and download once. Record:
   - **Key ID**
   - **Team ID** (top-right of the portal)

## 2. Supabase — hosted project `seamFlow2` (ref `aqsppiyiegzatnjvjgyp`)

Authentication → Providers → **Apple** → enable, then:

- **Client IDs**: your **bundle id** `com.bambothanson.FashionApp` (native iOS)
  **and** the **Services ID** (web) — comma-separated.
- **Secret Key (JWT)**: generate from Team ID + Key ID + the `.p8`. Supabase has
  a generator in the provider panel.
  ⚠️ This JWT **expires every ~6 months** and must be regenerated, or Apple
  sign-in silently breaks. Put a calendar reminder.

Keep `supabase/config.toml`'s `[auth.external.apple]` in sync (it's annotated),
though only the hosted project affects the live app.

## 3. Native rebuild (EAS)

- `ios.usesAppleSignIn: true` is already in `app.json` (adds the
  `com.apple.developer.applesignin` entitlement).
- Set up iOS credentials: `eas credentials` (Apple Team ID + signing).
- Rebuild the iOS app (`eas build -p ios --profile development`, or a new dev
  client). The entitlement only lands in a fresh native build.

## 4. Flip the switch

- Set `APPLE_SIGN_IN_ENABLED = true` in `lib/auth-context.tsx`.
- In `apps/seamflow-app/app/sign-in.tsx`, gate the button to iOS
  (`Platform.OS === 'ios' && …`) — the exact spot is marked with a comment.
  Apple requires the button on iOS (App Store guideline 4.8) and it's uncommon
  on Android.
- Test on a real device / dev client (Apple Sign-In does not work in Expo Go or
  the iOS simulator without a signed build).

## Known nuance — the user's name

Apple returns the display name **only on the very first authorization**, and it
is *not* in the identity token — so the profile-provisioning trigger can't see
it. `signInWithApple` captures it into auth metadata (`full_name`) when present;
the profile-setup screen is the fallback for everyone else.
