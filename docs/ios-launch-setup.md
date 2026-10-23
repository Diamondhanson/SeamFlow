# iOS — from an empty Developer account to TestFlight

Written against the repo as it stands. Everything below was checked, not
assumed; where something is already done it says so, and where something is
wrong it says that too.

**Your role is Admin**, which covers everything here except agreements. If a
page is greyed out, it needs the Account Holder (Deon Achuo, sird655@gmail.com).

Facts you will need repeatedly:

| | |
|---|---|
| Apple Team ID | `J449TN6SZG` (Deon Achuo's team) |
| iOS bundle id | `com.seamflowtech.app` |
| Android package | `com.bambothanson.FashionApp` — **different**, see §1 |
| EAS project | `diamondhans1998/FashionApp` (`da3ea415-e753-4047-b8cb-a1601ebfad64`) |
| Supabase ref | `aqsppiyiegzatnjvjgyp` |
| Google Cloud project | `879451838140` |

---

## 0. What is already done

No action needed on any of these — listed so nobody redoes them.

- `ios.bundleIdentifier` = `com.seamflowtech.app`
- `ios.usesAppleSignIn: true` — adds the Sign in with Apple entitlement
- `ios.config.usesNonExemptEncryption: false` — skips the export-compliance
  question on every single build, which otherwise blocks each TestFlight upload
- `ios.associatedDomains: applinks:www.seamflowtech.com`
- Every permission string is already written, in the plugin config: photos,
  camera, microphone, location, contacts, speech recognition. App Review
  rejects generic ones; these are specific.
- **In-app account deletion exists** (`app/(app)/me.tsx`, `app/(client)/hub`).
  This is guideline 5.1.1(v) and a hard rejection if missing.
- **The API refuses checkout from a store build** —
  `checkout.controller.ts:48` throws for `platform === 'ios'`. That is
  guideline 3.1.1 handled by design: the app never sells anything, so no IAP is
  required.

## 1. Repo problems to fix first

**a. `docs/apple-sign-in.md` has the wrong bundle id.** It says
`com.bambothanson.FashionApp` throughout. That is the *Android* package. On iOS
everything must use `com.seamflowtech.app`. The doc predates the split.

**b. `APPLE_SIGN_IN_ENABLED = false`** (`lib/auth-context.tsx:68`). Guideline
4.8 requires Sign in with Apple wherever a third-party sign-in like Google is
offered. This must be `true` before review, and the button gated to
`Platform.OS === 'ios'`.

**c. The Google plugin has no `iosUrlScheme`.** Currently the bare string in
`app.json`. iOS needs the reversed iOS client ID — §3.

**d. Universal links are declared but dead.** `www.seamflowtech.com` serves
`/.well-known/apple-app-site-association` with `"details": []`, so nothing
routes into the app. It needs the Team ID — §2.6.

**e. `expo-share-intent` will want an App Group** on iOS, defaulting to
`group.com.seamflowtech.app`. Create it (§2.2) or the share extension fails to
build.

## 2. Apple Developer portal — developer.apple.com

**2.1 — App ID.** Certificates, Identifiers & Profiles → Identifiers → + → App
IDs → App. Bundle ID `com.seamflowtech.app` (explicit, not wildcard). Enable:

- Sign in with Apple
- Push Notifications
- Associated Domains
- App Groups

**2.2 — App Group.** Identifiers → + → App Groups → `group.com.seamflowtech.app`.
Then go back into the App ID, edit App Groups, and tick it.

**2.3 — Services ID** (for Supabase's Apple web flow, which the native flow
still needs configured). Identifiers → + → Services IDs →
`com.seamflowtech.app.web`. Enable Sign in with Apple → Configure:

- Primary App ID: `com.seamflowtech.app`
- Return URL: `https://aqsppiyiegzatnjvjgyp.supabase.co/auth/v1/callback`

**2.4 — Sign in with Apple key.** Keys → + → tick *Sign in with Apple* →
configure to the App ID → download the `.p8`. **It downloads once.** Record the
**Key ID**.

**2.5 — APNs key.** Keys → + → tick *Apple Push Notifications service (APNs)* →
download the `.p8`, record the **Key ID**. One APNs key covers every app on the
team, so if the account already has one, reuse it rather than making a second.

**2.6 — Team ID — DONE.** `J449TN6SZG`. Needed for the Supabase JWT (§4) and
for the universal-links file (§8).

**2.7 — App Store Connect API key.** App Store Connect → Users and Access →
Integrations → App Store Connect API → + . Role: **App Manager** is enough.
Download the `.p8` and record the **Key ID** and **Issuer ID**. This is what
lets `eas submit` upload without an interactive login. If the tab is greyed
out, it needs the Account Holder.

## 3. Google Cloud — the iOS OAuth client

Same project as Android (`879451838140`). Credentials → + Create credentials →
OAuth client ID → **iOS**. Bundle ID `com.seamflowtech.app`.

It gives you a client ID like `879451838140-xxxx.apps.googleusercontent.com`.
The **reversed** form — `com.googleusercontent.apps.879451838140-xxxx` — is what
goes into `app.json` as `iosUrlScheme`.

Then: Supabase → Authentication → Providers → Google → **Authorized Client IDs**
→ append the iOS client ID to the web one, comma-separated. Both must be listed
or `signInWithIdToken` rejects the iOS token's audience.

## 4. Supabase — the Apple provider

Authentication → Providers → Apple → enable.

- **Client IDs**: `com.seamflowtech.app` **and** `com.seamflowtech.app.web`,
  comma-separated — the native bundle id and the Services ID.
- **Secret Key (JWT)**: generated from Team ID + Key ID + the Sign in with
  Apple `.p8`. Supabase has a generator in that panel.

> ⚠️ That JWT **expires about every six months** and Apple sign-in breaks
> silently when it does. Put a calendar reminder the day you create it.

## 5. EAS credentials

Run from `apps/seamflow-app`. This is interactive and signs in to Apple, so it
has to be you, not CI:

```bash
eas credentials --platform ios
```

Let EAS create the distribution certificate and provisioning profile. When it
offers to set up push, give it the APNs key from §2.5 — or let it create one
itself, which is simpler if the team has no key yet.

Then store the App Store Connect API key so submits are non-interactive:

```bash
eas credentials --platform ios   # → App Store Connect API Key → set up
```

## 6. App Store Connect — the app record

Apps → + → New App.

- Platform iOS, bundle id `com.seamflowtech.app`
- Name, primary language, SKU (any unique string, e.g. `seamflow-ios`)

Then, before a build can go to **external** TestFlight or review:

- **App Privacy** labels. Be honest and thorough — the app touches contacts,
  photos, camera, microphone, location, and audio recordings.
- **Age rating**
- **A demo account** for App Review with real data in it. Reviewers reject
  accounts that land on an empty state.

Internal TestFlight (your own team, up to 100 testers) needs none of this and
no review — which is why it is the right first target.

## 7. The build

```bash
cd apps/seamflow-app
eas build --platform ios --profile production
eas submit --platform ios --latest
```

`appVersionSource: "remote"` and `autoIncrement: true` are already set, so the
build number increments server-side exactly as it does on Android.

Processing in App Store Connect takes 10–30 minutes after upload. Then
TestFlight → Internal Testing → add testers.

## What is mine and what is yours

**Yours** (needs an Apple login I do not have): everything in §2, §3, §4, §5,
§6, and running the build in §7.

**Mine**, once you send the values below:

- fix the stale bundle id in `docs/apple-sign-in.md`
- flip `APPLE_SIGN_IN_ENABLED` and gate the button to iOS
- add `iosUrlScheme` to the Google plugin in `app.json`
- fill in the universal-links file with the Team ID
- add the App Group to `app.json` if the default needs overriding

**Send me four things:**

| | example |
|---|---|
| Team ID | `A1B2C3D4E5` |
| iOS OAuth client ID | `879451838140-xxxx.apps.googleusercontent.com` |
| Services ID | `com.seamflowtech.app.web` |
| App Group | `group.com.seamflowtech.app` |

Never send me the `.p8` files. They are secrets, they belong in EAS and
Supabase, and nothing in this repo should ever hold one.


---

## 8. Universal links — one environment variable

`apps/seamflow-web/app/.well-known/apple-app-site-association/route.ts` was
written to take the Team ID from the environment, so this is configuration and
not a deploy of new code:

**Vercel → the `seamflow-web` project → Settings → Environment Variables**

```
APPLE_TEAM_ID = J449TN6SZG
```

Add it to **Production** and **Preview**, then redeploy — Vercel only picks up a
new variable on a fresh build, so the currently deployed one will keep serving
the empty document until it is rebuilt.

Verify afterwards:

```bash
curl -s https://www.seamflowtech.com/.well-known/apple-app-site-association
```

`details` should hold `J449TN6SZG.com.seamflowtech.app` with paths `/t/*` and
`/fr/t/*`. While it stays `[]`, the `associatedDomains` entitlement in
`app.json` claims a domain that claims nothing back, and catalogue links keep
opening the browser.

Two things that route already gets right and that are easy to break: it is
served with **no file extension** as `application/json`, and it must never
redirect — Apple fetches that exact path and follows nothing.

## 9. Developer Program membership vs App Store Connect

These are two different lists, and being on one does not put you on the other:

| | Grants | Invited from |
|---|---|---|
| App Store Connect **Users and Access** | apps, TestFlight, app records | appstoreconnect.apple.com |
| Developer Program **People** | certificates, identifiers, profiles, **keys** | developer.apple.com → Account → People |

An invite to the first gives "Access Unavailable" on Certificates, Identifiers
& Profiles — the resource "is only for … members of an organization's team in a
developer program." The Account Holder has to invite separately from
developer.apple.com → People, and the invitee's Apple ID needs two-factor
authentication before the invitation can be accepted.

## 10. What signing actually ended up being — 2026-10-23

Deon is the Account Holder; we only ever had App Store Connect access. All of
this was done instead through the **App Store Connect API key**, which is a
team key with Admin access, so it can manage identifiers, certificates and
profiles without an Apple ID login and without Deon at the keyboard.

### The wall, and the way round it

Apple caps **iOS Distribution** certificates at two per team, and the team had
already spent both on Deon's other apps:

```
723GH973C2  iOS Distribution: Deon Achuo   expires 2027-04-30
96KF39RBRH  iOS Distribution: Deon Achuo   expires 2027-10-23
```

Asking for a third returns, flatly:

```
409 ENTITY_ERROR
You already have a current iOS Distribution certificate or a pending
certificate request.
```

`IOS_DISTRIBUTION` is the legacy type, though. **Apple Distribution**
(`DISTRIBUTION`) is a separate quota and is equally valid for App Store
signing, so that is what we hold:

| | |
|---|---|
| Certificate | `U6SMVHP76F` — Apple Distribution, expires **2027-10-23** |
| Profile | `4MW3CQ98CN` — `SeamFlow App Store (eas)`, App Store, ACTIVE |
| Profile UUID | `31e51bfe-6d00-452c-9427-d12c8e263be1` |
| App ID | `com.seamflowtech.app` → `VS9WGPC49X`, seed `J449TN6SZG` |
| ASC app record | `6826401334`, SKU `seamflow-ios` |

The private key was generated locally, so the `.p12` is ours and does not have
to be prised out of anyone's Keychain. It is exported with 3DES rather than
OpenSSL 3's default AES-256, because EAS parses it with node-forge and
node-forge cannot read AES-256 PBES2 bags.

Nothing secret lives in this repo. The key, the `.p12` and its password sit in
`~/.apple-keys/`, `credentials.json` is gitignored **and** easignored, and
`.easignore` already drops `*.p8`, `*.p12` and `*.mobileprovision`.

Renewal: the certificate dies **2027-10-23**. Both certificates in the team
expire within six months of each other, so by then the legacy slots free up.

### Why the iOS share extension is off

`expo-share-intent` does more on iOS than add an intent filter. It injects
`com.apple.security.application-groups` into the **main app's** entitlements
and adds a second Xcode target, `com.seamflowtech.app.share-extension` — which
would need its own App ID, its own provisioning profile, and an App Group named
`group.com.seamflowtech.app`.

That App Group cannot be created with the key we have. The App Store Connect
API has no App Groups resource at all — `/v1/appGroups` is a 404 for both GET
and POST — so it is portal-only, which means Deon.

The one that does exist in the portal is `group.group.com.seamflowtech.app`:
double-prefixed, because `group.` was typed into a field that already prepends
it. An entitlement the profile does not grant fails code signing, so as it
stood the build could not be signed.

So the plugin now carries `disableIOS: true`. Verified by prebuild:

```
[expo-share-intent] IOS module disabled
```

and the generated `SeamFlow.entitlements` contains exactly `aps-environment`,
`com.apple.developer.applesignin` and `com.apple.developer.associated-domains`
— no `application-groups`, no extension target. Android is untouched; its
intent filters still apply.

**To turn it back on later:** Deon creates App Group
`group.com.seamflowtech.app` and ticks it on `com.seamflowtech.app`; register
App ID `com.seamflowtech.app.share-extension` with App Groups; then drop
`disableIOS`, declare the extension under
`extra.eas.build.experimental.ios.appExtensions`, and move to EAS-managed
credentials — `credentials.json` carries one profile and cannot describe an
extension's.

### Still missing, and neither blocks a build

- **Google sign-in on iOS.** The plugin is a bare string, which takes the
  Firebase branch; with no `ios.googleServicesFile` both `setGoogleConfig` and
  `setGoogleServicesFile` return early, so it is a silent no-op rather than a
  prebuild error. Native Google sign-in stays dark on iOS until there is an iOS
  OAuth client and an `iosUrlScheme`.
- **Apple sign-in.** The entitlement ships and the capability is primary, but
  `APPLE_SIGN_IN_ENABLED` is still `false` and Supabase's Apple provider is not
  configured. The Sign in with Apple key exists; its `.p8` goes to Supabase,
  never here.

### APNs environment — the quiet one

`expo-notifications` writes `aps-environment` into the entitlements and its
`mode` **defaults to `development`**:

```js
const withNotificationsIOS = (config, { mode = 'development', ... }) => {
  if (!config.modResults['aps-environment']) {
    config.modResults['aps-environment'] = mode;
  }
```

eas-cli never rewrites that value — it only reads `aps-environment` to map the
entitlement onto a capability for capability sync. And **TestFlight uses
production APNs**, so a build shipped with `development` registers against the
sandbox and every push fails with `BadDeviceToken`.

So the plugin now carries `"mode": "production"`, which makes the entitlements
an exact match for the App Store profile:

```
aps-environment                         production
com.apple.developer.applesignin         Default
com.apple.developer.associated-domains  applinks:www.seamflowtech.com
```

The cost: this is static in `app.json`, and a **development** provisioning
profile grants `aps-environment: development`. So
`eas build --profile development --platform ios` would now fail to sign. There
has never been an iOS dev client, so nothing is broken today — but if one is
ever needed, move the value into an `app.config.js` that branches on
`process.env.EAS_BUILD_PROFILE` rather than flipping this back.
