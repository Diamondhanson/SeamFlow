import { Wordmark } from '../../components/Wordmark';

/**
 * 404 inside a language tree. Rendering here rather than falling through to
 * global-not-found means the page keeps the language's own <html lang dir>,
 * which for Arabic is the difference between a mirrored 404 and an LTR one.
 */
export default function LanguageNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-20 text-center">
      <div className="mb-6 h-px w-12 bg-accent/70" />
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-10 text-xs text-muted">
        <Wordmark className="h-4 w-auto opacity-70" />
      </p>
    </main>
  );
}
