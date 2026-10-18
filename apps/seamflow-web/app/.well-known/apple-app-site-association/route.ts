/**
 * iOS Universal Links — https://<host>/.well-known/apple-app-site-association
 *
 * INERT UNTIL THE APPLE DEVELOPER PROGRAM IS PAID. The document needs a Team
 * ID, which only exists once the $99/yr membership does (tracked in
 * docs/ROADMAP.md). Written now so switching iOS on later is configuration
 * rather than code: set APPLE_TEAM_ID and ship a build. The `associatedDomains`
 * entitlement is now on apps/seamflow-app (it used to be on seamflow-client,
 * which never shipped — see docs/qa-audit-plan.md finding A-1).
 *
 * Two details this file gets right that are easy to get wrong:
 *
 *   - It is served with NO file extension and as `application/json`. Apple's
 *     CDN fetches this path literally; `.json` on the end is a different URL
 *     and will not be found.
 *   - It must NOT be signed or redirected. Apple follows no redirects here, so
 *     the host serving it has to be the exact host in the links themselves.
 *
 * Paths are scoped to /t/* — the catalogue. Order share links (/o/*) stay in
 * the browser on purpose: they are read by a tailor's client, who is not the
 * audience for the client app and should not be pushed toward an install.
 */

/**
 * Must match `ios.bundleIdentifier` in the app that is actually SHIPPED.
 *
 * This said `com.bambothanson.seamflowclient` — apps/seamflow-client, which has
 * never been built. The shipping app is apps/seamflow-app, bundle id below.
 *
 * If seamflow-client is ever shipped, add a second entry to `details` rather
 * than changing this one.
 */
const APP_BUNDLE_ID = 'com.seamflowtech.app';

export const dynamic = 'force-dynamic';

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();

  // No Team ID yet → serve a well-formed document with no apps in it. Apple
  // treats that as "this domain claims nothing", which is exactly true today,
  // and is safer than publishing an appID built around a guessed Team ID.
  const details = teamId
    ? [{ appID: `${teamId}.${APP_BUNDLE_ID}`, paths: ['/t/*', '/fr/t/*'] }]
    : [];

  const body = {
    applinks: {
      apps: [],
      details,
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300',
    },
  });
}
