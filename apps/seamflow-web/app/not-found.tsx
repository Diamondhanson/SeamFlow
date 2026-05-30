export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-20 text-center">
      <div className="mb-6 h-px w-12 bg-accent/70" />
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        Order not found
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        The link you opened doesn&apos;t match an order. Double-check it with
        your tailor.
      </p>
      <p className="mt-10 text-xs text-muted">
        <span className="font-display font-semibold text-ink/70">SeamFlow</span>
      </p>
    </main>
  );
}
