# Over-the-air updates

Ship a fix to people's phones in minutes, without a store review. Powered by EAS
Update (`expo-updates`).

## What an update can and cannot change

| An update CAN change | Needs a new store build |
|---|---|
| Screens, logic, text and translations | A new or upgraded native module (Google sign-in, camera, etc.) |
| Images and fonts bundled in the app | `app.json` native settings: permissions, icon, splash, deep-link / intent filters, entitlements, push or sign-in config |
| Bug fixes, layout, copy | Anything that changes the Expo SDK version |
| | Changing `eas.json` channel or `updates` settings |

When unsure, ask: "does this need a native rebuild?" If it does, ship a build.

Apple and Google allow updates that fix and tweak the app. Do not use one to
change what the app fundamentally is, or to add something review would not have
approved.

## How it reaches a phone

1. Each store build is tied to a **channel** (`production`, `preview`) and to its
   **app version** (`runtimeVersion` policy `appVersion`, e.g. `1.5.2`).
2. On every app open the app asks for a newer update on its channel and downloads
   it in the background (`checkAutomatically: ON_LOAD`).
3. A downloaded update is used on the next cold start. If the app was only
   backgrounded, it asks once on return: "Update ready — Restart now / Later"
   (`lib/ota-update.tsx`).

An update for `1.5.2` only reaches `1.5.2` builds. After bumping the version, a
fix for the previous version has to be published for that version separately.

**Builds made before this was switched on (iOS 17, 18 and Android 24) have no
channel and cannot receive updates.** The first build with it is the one to ship
as the next store release.

## Publishing

```bash
cd apps/seamflow-app
npm run update:production -- "Fix stuck dialog on the orders screen"
```

The script type-checks, runs the i18n guard, and bundles with the PRODUCTION
settings from `eas.json`. Do not run a bare `eas update`: the local `.env`
points the API at `localhost`, and the update would ship that.

### Test first
Publish to `preview` and open a preview build before production:

```bash
npm run update:preview -- "Fix stuck dialog on the orders screen"
```

### Roll back
```bash
npx eas-cli update:list --branch production           # find the previous good update
npx eas-cli update:republish --group <group-id> --destination-channel production
```
(or `update:rollback` to go back to the embedded build).

## Rules of thumb
- A bad update reaches everyone on the channel at once. Check it on `preview` first.
- The server must keep working for older app versions: an update cannot undo a
  database or API change.
- EAS Update is billed by monthly active users above the free allowance. Check the
  Expo plan.
