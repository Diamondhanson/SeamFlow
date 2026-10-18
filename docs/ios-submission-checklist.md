# The next native build, and the App Store submission

Five audit findings all land in the same place: a native rebuild. Doing them as
one build rather than five is the point of this file — each needs the same
`eas build`, and three of them need the Apple Developer Program first.

Ordered by what blocks what.

---

## 1. Buy the Apple Developer Program ($99/yr)

Three findings are waiting on it and nothing else:

- **A-2 — Apple Sign-In.** `APPLE_SIGN_IN_ENABLED = false` in
  `lib/auth-context.tsx`, so the button currently shows a coming-soon dialog.
  **This is a submission blocker, not a nice-to-have**: Google sign-in is
  offered, so App Store guideline 4.8 requires an equivalent privacy-preserving
  option, and a button that does nothing also invites 2.1. Steps are in
  `docs/apple-sign-in.md`: an App ID with the capability, a Services ID, a .p8
  key, the provider enabled in Supabase, then flip the flag.
- **A-1 — deep links on iOS.** The `associatedDomains` entitlement is now on
  `seamflow-app` (it was on the app that never shipped). Set `APPLE_TEAM_ID` in
  Vercel so `/.well-known/apple-app-site-association` stops serving an empty
  document.
- **A-3 — APNs credentials.** None are in EAS, so iOS push has never worked.

## 2. Do a throwaway iOS build NOW

**A-3.** There is no `ios/` directory and the iOS app has never been built
anywhere. The first EAS iOS build will be the first time ~30 Expo modules —
share-intent, glass-effect, speech-recognition, image-picker, secure-store,
apple-authentication — are compiled together for that platform.

Do it before you need it. A failure costs nothing today and costs a release
slot later. It cannot be done on the current machine: there is no Xcode, only
Command Line Tools, and `xcrun simctl` lists no simulators.

## 3. Add what wants a rebuild anyway

Both of these are deliberately *not* installed yet, because a native dependency
added in a bug-fix pass is a dependency nobody decided on. They are ready to go
in when a build is happening regardless.

- **B-1 — crash reporting.** `lib/crash-reporting.ts` is the seam: with no DSN
  it reports nothing and costs nothing, so the app behaves exactly as it does
  today. Switching it on is `npx expo install @sentry/react-native`, its config
  plugin in `app.json`, a **separate** Sentry project from the API's (so app
  stack traces and server traces are not interleaved),
  `EXPO_PUBLIC_SENTRY_DSN` in `eas.json`, and replacing the two function
  bodies. The error boundary is already live and already calls it.
- **B-3 — image caching.** `expo-image` is not a dependency; all 53 `<Image>`
  usages are React Native's, whose cache is in-memory and small. Discover, the
  storefronts and the design carousels are grids of remote Supabase images, so
  scrolling away and back re-downloads them — on the mobile data this product is
  built for. Swap the *remote* image sites (feed, storefront, designs, message
  thumbnails); local `require()`d assets can stay as they are.

## 4. Verify the privacy manifest on that build

**B-5.** There is no `ios.privacyManifests` in `app.json`. Expo's prebuild
generates a baseline `PrivacyInfo.xcprivacy` for its own modules, so this may
already be correct — but it cannot be checked without generating the iOS
project. A missing or incomplete manifest is a routine rejection, so confirm it
exists in the build artifact rather than discovering it at review.

APIs in use that need a declared reason: file timestamps (`expo-file-system`),
user defaults (`AsyncStorage`), and disk space.

## 5. Fill in App Store Connect from the code, not from memory

**B-6.** A privacy questionnaire that disagrees with the `Info.plist` is a
rejection. What this app actually asks for and collects:

| Permission | Why, in the app's own words |
|---|---|
| Contacts | adding clients without retyping |
| Camera | photographing garments and fittings |
| Photo library | attaching reference and order photos |
| Microphone | talking to the assistant |
| Speech recognition | turning that into text |
| Location (when in use) | confirming once where the shop is — never background |

Data collected: **body measurements**, names, phone numbers, postal addresses,
email addresses, photographs, and chat messages. Measurements are
health-adjacent and reviewers read that section carefully — declare them.

Also true and worth declaring accurately: account deletion is in-app
(`/delete-account`, 30-day grace, then a real purge), and
`usesNonExemptEncryption: false` is correct — standard crypto only.

## 6. iPad

**P-10.** `supportsTablet: true` is a promise to the reviewer that the app works
at that size, and it needs iPad screenshots. Nothing has been checked at tablet
dimensions. Either verify it or set it to `false` before submitting — an
untested iPad layout is a rejection that costs a week.

---

## After the build

- Re-run `pnpm test:e2e:all` from `apps/seamflow-api` against whatever the app
  is pointed at.
- Confirm deep links actually open the app: tap a `https://www.seamflowtech.com/t/<slug>`
  link from Notes or Messages, not from Safari's address bar — Safari does not
  honour Universal Links typed directly.
- Confirm push arrives on a real device, which is the only place it can work.
