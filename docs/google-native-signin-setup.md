# Native Google Sign-In — finishing setup (your part)

**Steps 1 and 2 are done** (module installed, config plugin added, branch merged
to `main`). What is left is the Google Cloud / Supabase configuration and the
one env var.

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

## 1. Install the native module — DONE

```bash
cd apps/seamflow-app
npx expo install @react-native-google-signin/google-signin
```

This adds the dependency **and updates `pnpm-lock.yaml`** — commit both, or the
EAS build will fail on the frozen lockfile. (Run this on a machine with
Node ≥ 22.13 so pnpm works.)

## 2. Add the config plugin — DONE

Added to `apps/seamflow-app/app.json` as the bare string, next to
`expo-secure-store`:

```json
"@react-native-google-signin/google-signin"
```

Bare on purpose: on Android the plugin's only job is autolinking, which takes no
options. iOS needs `iosUrlScheme` (the reversed **iOS** client ID), and that
client does not exist yet — adding the object form now would be a placeholder
that fails the first iOS build rather than a configuration. When the Apple
Developer Program is sorted, swap the string for:

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

## 4. Set the env var — DONE

The slot already exists at the bottom of `apps/seamflow-app/.env`, empty. Paste
the value there **and** into the `production` and `preview` env blocks in
`apps/seamflow-app/eas.json` (EAS reads those at build time; `.env` is not
uploaded):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the WEB client ID>.apps.googleusercontent.com
```

Empty is safe: `config.googleWebClientId` falls back to `''`, the gate in
`signInWithGoogle` is skipped, and the browser flow runs exactly as it does
today.

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


---

## Verified at merge time

With the module installed and the plugin added, `expo export` puts each half
where it belongs — checked rather than assumed:

| symbol | android bundle | web bundle |
|---|---|---|
| `GoogleSignin` | present | absent |
| `hasPlayServices` | present | absent |
| `signInWithIdToken` | present | absent |
| web stub's "not available on web" | absent | present |

So the web app at `app.seamflowtech.com` never pulls the native module in, and
keeps the browser flow — which it has to, since there is no native picker in a
browser.

## The name Google shows on the consent screen

Separate from all of the above. The "to continue to …" string comes from the
**OAuth consent screen → App name** in Google Cloud, not from our code. If it
shows the `<ref>.supabase.co` domain, that field is unset — the browser flow
redirects through Supabase's callback, so that domain is what is left to fall
back on. Setting App name (and a logo) fixes it for the browser flow, which is
the only flow web users ever see. The native picker sidesteps it entirely:
there is no redirect through Supabase at all.


---

## The client IDs in use (project 879451838140)

| Type | Client ID | Where it lives |
|---|---|---|
| **Web** | `879451838140-eistmr1hlcsbvbd7j4to09tcn1a6dsuq` | `.env` and the `production`/`preview` env blocks in `eas.json`. This is the one the code uses — `configure({ webClientId })` — and the audience Supabase validates the ID token against. |
| **Android** | `879451838140-t5j9lcshrk5tnta0n0sku5icvrve3fjh` | Nowhere in the repo, and that is correct. Android is matched by package name + SHA-1 registered in Google Cloud, not by a string we ship. Recorded here so nobody goes looking for it. |
| **iOS** | — | Not created. Needed for `iosUrlScheme` when the Apple Developer Program is sorted. |

Client IDs are public by design — they ship inside the installed app — so
committing the web one to `eas.json` is no more exposed than the Supabase anon
key already sitting beside it.

Verified inlined into the Android bundle at build time:

```
$ grep -oa "879451838140[-a-z0-9]*" entry-*.hbc
879451838140-eistmr1hlcsbvbd7j4to09tcn1a6dsuq
```

One caveat worth repeating from step 5: if the first build signs in locally but
fails with `DEVELOPER_ERROR (10)` for people who installed from Play, the
**Play app-signing SHA-1** is missing from the Android client. Local builds use
the upload key; Play re-signs with a different one, and both have to be
registered.
