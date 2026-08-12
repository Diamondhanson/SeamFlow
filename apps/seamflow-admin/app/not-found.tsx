import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Not found</h1>
      <p className="mt-3 text-sm text-muted">
        No record with that id. It may have been deleted, or the link may be from a different environment.
      </p>
      <Link href="/" className="mt-5 inline-block text-sm text-copper underline underline-offset-4 hover:text-ink">
        ← Back to the overview
      </Link>
    </div>
  );
}
