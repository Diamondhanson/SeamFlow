export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">SeamFlow</h1>
      <p className="mt-4 text-muted">
        This is the client-facing site. Order links sent by your tailor look
        like <code className="text-ink">seamflow.app/o/&lt;token&gt;</code>.
      </p>
    </main>
  );
}
