'use client';

// Every page here is one database query, so a page-level failure is almost
// always a connection problem rather than a bug in the view. Show the actual
// message: this is a developer's own tool, and hiding the error behind
// "Something went wrong" would cost the one clue worth having.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Query failed</h1>
      <p className="mt-3 text-sm text-muted">
        This page is a single query against the production database. The usual causes are a sleeping pooler, a stale
        connection after a hot reload, or a missing <code className="font-mono text-xs">DATABASE_URL</code>.
      </p>
      <pre className="mt-5 overflow-x-auto border border-rule bg-surface p-4 font-mono text-xs text-bad">
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        className="mt-5 bg-primary px-3 py-1.5 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
