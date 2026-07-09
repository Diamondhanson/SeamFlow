import type { Dict } from '../lib/i18n';
import { Icon } from './icons';
import { PhoneFrame } from './PhoneFrame';
import { StoreBadges } from './StoreBadges';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary">
      {children}
    </span>
  );
}

// ── Problem → solution ──────────────────────────────────────────────────────
export function Problem({ d }: { d: Dict }) {
  return (
    <section className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:py-20">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-4xl border border-brand-hairline bg-brand-surface/60 p-8 sm:p-10">
          <Eyebrow>{d.problem.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-brand-ink sm:text-3xl">
            {d.problem.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-muted">{d.problem.body}</p>
        </div>
        <div className="relative overflow-hidden rounded-4xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary to-brand-primaryDeep p-8 text-white shadow-soft sm:p-10">
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 h-40 w-40 transform-gpu rounded-full bg-brand-lavender/30 blur-2xl"
          />
          <div className="relative">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
              <Icon name="logo" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold leading-tight sm:text-3xl">
              {d.problem.solutionTitle}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">
              {d.problem.solutionBody}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features grid ───────────────────────────────────────────────────────────
const TINTS = [
  { fg: 'text-brand-primary', bg: 'bg-brand-primary/10' },
  { fg: 'text-brand-accent', bg: 'bg-brand-accent/10' },
  { fg: 'text-brand-success', bg: 'bg-brand-success/10' },
];

export function Features({ d }: { d: Dict }) {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>{d.nav.features}</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
          {d.features.heading}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-brand-muted">
          {d.features.subheading}
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {d.features.items.map((f, i) => {
          const t = TINTS[i % TINTS.length];
          return (
            <div
              key={f.key}
              className="group rounded-3xl border border-brand-hairline bg-brand-surface/60 p-6 transition hover:-translate-y-0.5 hover:border-brand-primary/20 hover:shadow-soft"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t.bg} ${t.fg}`}>
                <Icon name={f.key} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-brand-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── How it works (steps) ────────────────────────────────────────────────────
export function Steps({ d }: { d: Dict }) {
  return (
    <section id="how" className="scroll-mt-24 bg-brand-surface/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{d.steps.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            {d.steps.heading}
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {d.steps.items.map((s, i) => (
            <div key={i} className="relative rounded-3xl border border-brand-hairline bg-brand-bg p-7">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-primary to-brand-lavender font-display text-lg font-bold text-white shadow-glow">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-brand-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Vision ──────────────────────────────────────────────────────────────────
export function Vision({ d }: { d: Dict }) {
  return (
    <section className="mx-auto max-w-4xl scroll-mt-24 px-5 py-20 text-center sm:py-24">
      <Eyebrow>{d.vision.eyebrow}</Eyebrow>
      <h2 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-brand-ink sm:text-[2.5rem]">
        {d.vision.title}
      </h2>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-muted">
        {d.vision.body}
      </p>
    </section>
  );
}

// ── Gallery ─────────────────────────────────────────────────────────────────
export function Gallery({ d }: { d: Dict }) {
  return (
    <section className="relative overflow-hidden py-8">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            {d.gallery.heading}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-muted">
            {d.gallery.subheading}
          </p>
        </div>
        <div className="mt-12 flex flex-wrap items-end justify-center gap-8">
          <PhoneFrame variant="order" className="translate-y-4 opacity-95" />
          <PhoneFrame variant="home" className="z-10 scale-105" />
          <PhoneFrame variant="order" className="hidden translate-y-4 opacity-95 sm:block" />
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────────────────────
export function Cta({ d }: { d: Dict }) {
  return (
    <section id="get-app" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-brand-primary via-brand-primaryDeep to-[#2B1F86] p-10 text-center text-white shadow-glow sm:p-16">
        <div aria-hidden="true" className="absolute -left-16 -top-16 h-56 w-56 transform-gpu rounded-full bg-brand-lavender/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-16 -right-10 h-56 w-56 transform-gpu rounded-full bg-brand-accent/25 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">
            {d.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{d.cta.body}</p>
          <div className="mt-8 flex justify-center">
            <StoreBadges d={d} />
          </div>
        </div>
      </div>
    </section>
  );
}
