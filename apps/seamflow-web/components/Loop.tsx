import type { Dict } from '../lib/i18n';

// Fixed per-side styling. These colours do NOT track the audience toggle — the
// whole point of the band is to show both sides of the marketplace at once, so
// the customer nodes stay rose and the tailor nodes stay purple regardless of
// which door the visitor came through.
const DOT: Record<string, string> = {
  customer: 'bg-brand-rose',
  tailor: 'bg-brand-primary',
  both: 'bg-gradient-to-br from-brand-primary to-brand-rose',
};
const ROLE: Record<string, string> = {
  customer: 'text-brand-roseLight',
  tailor: 'text-brand-lavender',
  both: 'text-white/70',
};

/**
 * "Two sides, one thread" — the band that makes the dual-audience story explicit.
 * Always visible, in both colours, for both audiences: it's the one place the
 * page says out loud that tailors and customers are two ends of the same loop.
 */
export function Loop({ d }: { d: Dict }) {
  const { loop, loopRoles } = d.audience;
  const roleLabel: Record<string, string> = {
    customer: loopRoles.customer,
    tailor: loopRoles.tailor,
    both: loopRoles.both,
  };

  return (
    <section id="loop" className="relative mt-8 overflow-hidden bg-brand-ink py-20 text-white sm:mt-12 sm:py-24">
      {/* Dual wash: purple pulled in from one corner, rose from the other. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60% 70% at 0% 0%, rgba(123,48,232,0.28) 0%, rgba(123,48,232,0) 60%), radial-gradient(60% 70% at 100% 100%, rgba(225,70,133,0.26) 0%, rgba(225,70,133,0) 60%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-br from-brand-primary to-brand-rose" />
            {loop.eyebrow}
          </span>
          <h2 className="mt-5 text-balance font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {loop.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/65">
            {loop.subtitle}
          </p>
        </div>

        <ol className="relative mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* The thread: a faint purple→rose hairline running behind the dots on
              wide screens. top-5 aligns it with the centre of the h-10 dots. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-5 hidden h-px bg-gradient-to-r from-brand-primary/50 via-brand-lavender/40 to-brand-rose/50 lg:block"
          />
          {loop.nodes.map((n, i) => (
            <li key={i} className="relative flex flex-col">
              <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-lg ring-4 ring-brand-ink ${DOT[n.side] ?? DOT.both}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide lg:mt-3 ${ROLE[n.side] ?? ROLE.both}`}
                >
                  {roleLabel[n.side] ?? roleLabel.both}
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">{n.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{n.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
