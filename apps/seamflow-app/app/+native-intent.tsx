// ============================================================================
// Links the OS hands the app that are NOT pages.
//
// When someone shares a photo into SeamFlow from the iPhone share menu, the share
// extension (a separate little app) drops the photos where the main app can read
// them, then opens the main app with a link shaped like
//
//     seamflow://dataUrl=seamflowShareKey?nonce=...#media
//
// expo-router reads every incoming link as a route. This one matches none, so
// without this file the person lands on an "Unmatched route" screen instead of
// the app. The photos are picked up separately, by expo-share-intent's own
// listener (lib/use-share-listener.ts), which sees the same link; all the router
// has to do is stay out of the way and land somewhere real.
//
// Android never uses this: its share sheet delivers an intent, not a link.
// ============================================================================

import Constants from 'expo-constants';

const SHARE_HANDOVER = `dataUrl=${Constants.expoConfig?.scheme ?? 'seamflow'}ShareKey`;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // The entry route decides where this person belongs (their shop, or the
  // customer side), and the share listener takes it from there.
  if (path.includes(SHARE_HANDOVER)) return '/';

  // A shared design: the website's page for it lives at /d/<id>, the app's at
  // /discover/<id>. The router would otherwise read /d/<id> as a page that does
  // not exist.
  const design = path.match(/^\/d\/([A-Za-z0-9-]+)/);
  if (design) return `/discover/${design[1]}`;

  // /o/<code> (an order shared with a customer) is handled by its own screen,
  // app/(client)/o/[code].tsx, and needs no rewriting.
  return path;
}
