import { Wordmark } from '../components/Wordmark';
import { fontVariables } from '../lib/fonts';
import './globals.css';

/**
 * The 404 for anything that matches no route tree at all.
 *
 * This is `global-not-found`, not `not-found`, because there is no single root
 * layout any more — a plain app/not-found.tsx has no layout to render inside
 * and fails the build outright. This file therefore renders its own
 * <html>/<body>. Requires experimental.globalNotFound in next.config.
 *
 * A miss inside a language tree is handled by app/[lang]/not-found.tsx instead,
 * so it keeps that language's chrome.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="min-h-screen font-sans antialiased">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-20 text-center">
          <div className="mb-6 h-px w-12 bg-accent/70" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Page not found
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            The link you opened doesn&apos;t match anything here. Double-check it
            with whoever sent it to you.
          </p>
          <p className="mt-10 text-xs text-muted">
            <Wordmark className="h-4 w-auto opacity-70" />
          </p>
        </main>
      </body>
    </html>
  );
}
