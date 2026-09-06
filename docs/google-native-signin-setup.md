# Native Google Sign-In — finishing setup (your part)

The **code is done and dormant.** Until the steps below are complete, Google
sign-in keeps using the current browser/OAuth flow. Once the web client ID is
set **and a native build ships**, it switches to Google's in-app account picker
(the "small dialog" — no browser, no redirect).

What the code already does (`lib/auth-context.tsx` → `signInWithGoogle`):
on a **native** build, if `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set, it opens the
native picker (`lib/google-native.ts`), gets a Google **ID token**, and exchanges
it with Supabase via `signInWithIdToken` — the same path Apple already uses. Web
always uses the browser flow (`lib/google-native.web.ts` stub).

---

## 1. Install the native module

```bash
cd apps/seamflow-app
npx expo install @react-native-google-signin/google-signin
```

This adds the dependency **and updates `pnpm-lock.yaml`** — commit both, or the
EAS build will fail on the frozen lockfile. (Run this on a machine with
Node ≥ 22.13 so pnpm works.)

## 2. Add the config plugin

In `apps/seamflow-app/app.json`, add to the `plugins` array:

```json
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.XXXX-XXXX" }
]
```

- Android needs nothing extra here — it uses the existing `google-services.json`.
- `iosUrlScheme` = your **iOS** OAuth client's *reversed* client ID. iOS is gated
  on the Apple Developer Program anyway, so you can add the bare string
  `"@react-native-google-signin/google-signin"` for now and add the iOS object
  later.

> Don't add the plugin *before* step 1 — Expo resolves plugins at config time, so
> referencing an uninstalled plugin breaks `expo start` and the web build too.

## 3. Create OAuth client IDs (Google Cloud Console → Credentials)

Create three OAuth 2.0 client IDs under the same project:

| Type | Notes |
|---|---|
| **Web application** | This is the important one. Its client ID is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` **and** the ID-token audience Supabase validates. |
| **Android** | Package name `com.bambothanson.FashionApp` + SHA-1 (see step 5). |
| **iOS** (later) | Bundle id `com.seamflowtech.app`; gives you the reversed client ID for `iosUrlScheme`. |

## 4. Set the env var

Add to `apps/seamflow-app/.env` (local) **and** the EAS `production`/`preview`
build profiles (`eas.json` env, or EAS project env vars):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the WEB client ID>.apps.googleusercontent.com
```

## 5. Android SHA-1 fingerprints — the gotcha

Add **both** SHA-1s to the **Android** OAuth client, or Play-distributed builds
fail with `DEVELOPER_ERROR (10)` even though local builds work:

1. **Upload key** SHA-1 (you already have this on file).
2. **Play app-signing** SHA-1 — Play Console → your app → **Setup → App
   integrity → App signing** → copy the SHA-1.

(For local dev-client testing, also add your debug keystore SHA-1.)

## 6. Supabase → Authorized Client IDs

Supabase dashboard → **Authentication → Providers → Google** → keep it enabled and
add the **Web** client ID to **"Authorized Client IDs"** (comma-separated). This is
what lets `signInWithIdToken` accept the token's audience. You can leave the
existing OAuth redirect config in place (used by the web browser fallback).

## 7. New EAS build

Because this adds a native module, it ships in the **next build**, not an OTA JS
update:

```bash
eas build --platform android --profile production
```

After it's on a device with the env var set, tapping **Continue with Google**
opens the native account sheet.

---

### Quick verification
- **Before** the env var / build: Google sign-in still opens the browser (unchanged).
- **After**: native sheet on Android; no browser. If you see `DEVELOPER_ERROR`,
  re-check step 5 (almost always the missing Play app-signing SHA-1).
