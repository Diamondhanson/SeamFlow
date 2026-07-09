import type { Dict } from '../lib/i18n';
import { ANDROID_APK_URL } from '../lib/i18n';

// Store badges. iOS is still a "coming soon" placeholder; Android becomes a
// real "Download for Android" button once ANDROID_APK_URL is set.

const AppleGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.36 12.9c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.29 2-1.4 2.44-.36 6.05 1.01 8.03.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.62-.65 1.22 0 1.57.65 2.64.63 1.09-.02 1.78-.99 2.45-1.96.77-1.12 1.09-2.21 1.11-2.27-.02-.01-2.13-.82-2.15-3.25zM14.4 6.9c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.97 1.56-.85 2.48.9.07 1.83-.46 2.39-1.13z" />
  </svg>
);

const AndroidGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.2 2.6c-.3.2-.5.6-.5 1.1v16.6c0 .5.2.9.5 1.1l9-9.4-9-9.4zM15.9 9.1 6.6 3.7l7.7 8 1.6-2.6zM14.3 12.3l-7.7 8 9.3-5.4-1.6-2.6zM17 10.1l-2 2 2 2 2.9-1.7c.6-.4.6-1.2 0-1.6L17 10.1z" />
  </svg>
);

/** Non-linked placeholder with a "coming soon" ribbon. */
function ComingSoonBadge({
  eyebrow,
  title,
  glyph,
  soon,
}: {
  eyebrow: string;
  title: string;
  glyph: React.ReactNode;
  soon: string;
}) {
  return (
    <div className="group relative inline-flex select-none items-center gap-3 rounded-2xl bg-brand-ink px-4 py-2.5 text-white shadow-soft">
      <span className="absolute -right-2 -top-2 rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink shadow-pill">
        {soon}
      </span>
      <span className="h-7 w-7 shrink-0 text-white">{glyph}</span>
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-white/70">{eyebrow}</span>
        <span className="block text-sm font-semibold">{title}</span>
      </span>
    </div>
  );
}

/** Real download link for the built Android APK. */
function AndroidDownload({
  href,
  eyebrow,
  title,
  glyph,
}: {
  href: string;
  eyebrow: string;
  title: string;
  glyph: React.ReactNode;
}) {
  return (
    <a
      href={href}
      download
      className="group inline-flex select-none items-center gap-3 rounded-2xl bg-brand-ink px-4 py-2.5 text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-primaryDeep hover:shadow-glow"
    >
      <span className="h-7 w-7 shrink-0 text-white">{glyph}</span>
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-white/70">{eyebrow}</span>
        <span className="block text-sm font-semibold">{title}</span>
      </span>
    </a>
  );
}

export function StoreBadges({ d }: { d: Dict }) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* iOS — not built yet */}
      <ComingSoonBadge soon={d.store.soon} eyebrow="Download on the" title="App Store" glyph={AppleGlyph} />

      {/* Android — real APK download when available, else coming soon */}
      {ANDROID_APK_URL ? (
        <AndroidDownload
          href={ANDROID_APK_URL}
          eyebrow={d.store.androidEyebrow}
          title={d.store.androidCta}
          glyph={AndroidGlyph}
        />
      ) : (
        <ComingSoonBadge soon={d.store.soon} eyebrow="Get it on" title="Google Play" glyph={AndroidGlyph} />
      )}
    </div>
  );
}
