// ============================================================================
// PWA wiring — manifest link, theme colour, service worker, iOS install hint.
//
// Expo's web output is a single index.html we don't control directly, so we
// inject the PWA head tags at runtime and register the service worker from
// /public/sw.js (copied verbatim into the build). No-ops on native.
// ============================================================================

import { isWeb } from './platform-capabilities';

/** Add the manifest + iOS meta tags, then register the shell service worker. */
export function installPwa(): void {
  if (!isWeb) return;
  try {
    const doc = globalThis.document;
    if (!doc) return;

    const head = (rel: string, attrs: Record<string, string>) => {
      if (doc.querySelector(`link[rel="${rel}"][href="${attrs.href}"]`)) return;
      const el = doc.createElement('link');
      el.setAttribute('rel', rel);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      doc.head.appendChild(el);
    };
    const meta = (name: string, content: string) => {
      if (doc.querySelector(`meta[name="${name}"]`)) return;
      const el = doc.createElement('meta');
      el.setAttribute('name', name);
      el.setAttribute('content', content);
      doc.head.appendChild(el);
    };

    head('manifest', { href: '/manifest.json' });
    head('apple-touch-icon', { href: '/apple-touch-icon.png' });
    meta('theme-color', '#7B30E8');
    // iOS standalone flags — without these an added-to-home-screen SeamFlow
    // opens in a Safari chrome instead of looking like an app.
    meta('apple-mobile-web-app-capable', 'yes');
    meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    meta('apple-mobile-web-app-title', 'SeamFlow');
    meta('mobile-web-app-capable', 'yes');

    // Service worker: only in production builds served over https (or
    // localhost). Failures are non-fatal — the app works without it.
    const nav = globalThis.navigator;
    const loc = globalThis.location;
    const secure = loc?.protocol === 'https:' || loc?.hostname === 'localhost';
    if (nav?.serviceWorker && secure) {
      globalThis.addEventListener?.('load', () => {
        nav.serviceWorker.register('/sw.js').catch(() => {
          // Registration blocked (private mode, unsupported) — ignore.
        });
      });
    }
  } catch {
    // Non-DOM environment — nothing to do.
  }
}

/**
 * True when the app is running as an installed PWA (home-screen launch),
 * used to hide the "add to home screen" hint once it's redundant.
 */
export function isStandalone(): boolean {
  if (!isWeb) return false;
  try {
    const mm = globalThis.matchMedia?.('(display-mode: standalone)');
    const iosStandalone = (globalThis.navigator as { standalone?: boolean } | undefined)
      ?.standalone;
    return !!mm?.matches || !!iosStandalone;
  } catch {
    return false;
  }
}

/** iOS Safari never offers an install prompt — users must be told the gesture. */
export function isIosSafariBrowser(): boolean {
  if (!isWeb) return false;
  try {
    const ua = globalThis.navigator?.userAgent ?? '';
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return isIos && isSafari && !isStandalone();
  } catch {
    return false;
  }
}
