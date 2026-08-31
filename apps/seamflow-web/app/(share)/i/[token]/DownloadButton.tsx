'use client';

// The browser's print dialog doubles as "Save as PDF". Hidden from the printed
// output via the `.no-print` class + the @media print rules in globals.css.
export function DownloadButton() {
  return (
    <div className="no-print mt-8 text-center">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-background"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Download PDF
      </button>
    </div>
  );
}
