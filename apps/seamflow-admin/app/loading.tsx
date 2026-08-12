// Shown while a page's single query is in flight. The database is ~0.3–1s away
// warm and several seconds cold, which is long enough that a blank main panel
// reads as a broken link rather than as work in progress.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-9 border-b-2 border-rule pb-5">
        <div className="h-9 w-64 bg-surface" />
        <div className="mt-4 h-4 w-full max-w-xl bg-surface" />
      </div>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-l border-rule pl-4">
            <div className="h-8 w-14 bg-surface" />
            <div className="mt-3 h-3 w-20 bg-surface" />
          </div>
        ))}
      </div>
      <div className="mt-12 h-40 w-full bg-surface" />
      <div className="mt-10 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-9 w-full bg-surface" />
        ))}
      </div>
    </div>
  );
}
