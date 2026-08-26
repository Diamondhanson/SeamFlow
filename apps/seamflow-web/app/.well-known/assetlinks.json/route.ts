/**
 * Android App Links verification — https://<host>/.well-known/assetlinks.json
 *
 * Serving this from a route handler rather than dropping a static file in
 * public/ buys one thing: the signing fingerprints come from an env var. A
 * committed file would have to carry a placeholder until the client app is
 * first built, and a placeholder here is worse than nothing — Android caches
 * the result of a failed verification, so a wrong fingerprint can keep links
 * opening in the browser well after the real one is published.
 *
 * Set ANDROID_CERT_FINGERPRINTS in Vercel to a comma-separated list of
 * SHA-256 fingerprints (the colon-separated uppercase hex form that
 * `eas credentials` and `keytool` print). List EVERY key that signs a build
 * you want to intercept links: debug and release are different keys, and if
 * Play App Signing is on, Google's key is the one users actually get — not
 * your upload key.
 *
 *   ANDROID_CERT_FINGERPRINTS="AA:BB:...,11:22:..."
 *
 * Until it is set this returns an empty target list, which is a valid document
 * that simply verifies nothing. Links keep opening in the browser — the
 * behaviour we already have — and no cached failure has to be undone later.
 *
 * The HOST matters as much as the contents. Android matches App Links on an
 * exact hostname and does not follow redirects during verification, so this
 * must be served from the same host the links are minted on
 * (www.seamflowtech.com — see catalogueUrl in @seamflow/utils).
 */

/** Must match `android.package` in apps/seamflow-client/app.json. */
const CLIENT_PACKAGE = 'com.bambothanson.seamflowclient';

export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const body = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: CLIENT_PACKAGE,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      // Short cache: this file changes when a new signing key is added, and a
      // long TTL turns that into a day of links silently not opening the app.
      'cache-control': 'public, max-age=300',
    },
  });
}
