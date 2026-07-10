import type { Dict } from '../lib/i18n';
import { Icon } from './icons';
import { PhoneFrame, TabletFrame } from './PhoneFrame';
import { StoreBadges } from './StoreBadges';

export function Hero({ d }: { d: Dict }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-8 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-16">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/70 px-3 py-1 text-xs font-medium text-brand-muted">
            <Icon name="spark" className="h-3.5 w-3.5 text-brand-primary" />
            {d.hero.eyebrow}
          </span>

          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-brand-ink sm:text-5xl lg:text-6xl">
            {d.hero.title}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-muted">
            {d.hero.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#get-app"
              className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-base font-semibold text-white shadow-glow transition hover:bg-brand-primaryDeep"
            >
              {d.hero.ctaPrimary}
              <Icon name="arrow" className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center rounded-full border border-brand-border bg-brand-surface/60 px-6 py-3 text-base font-semibold text-brand-ink transition hover:bg-brand-surface"
            >
              {d.hero.ctaSecondary}
            </a>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-brand-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-success" />
            {d.hero.note}
          </p>

          <div className="mt-8">
            <StoreBadges d={d} />
          </div>
        </div>

        {/* Two-device composition: a landscape tablet in front, with the phone
            shifted right and peeking out behind it. The art is drawn at a fixed
            size and scaled responsively, so it never reflows or overflows. */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative h-[259px] w-[307px] sm:h-[367px] sm:w-[435px] lg:h-[432px] lg:w-[512px] xl:h-[513px] xl:w-[608px]">
            <div className="absolute left-0 top-0 origin-top-left scale-[0.48] sm:scale-[0.68] lg:scale-[0.80] xl:scale-[0.95]">
              <div className="relative h-[540px] w-[640px]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 transform-gpu rounded-[80px] bg-gradient-to-tr from-brand-primary/50 via-brand-lavender/40 to-brand-accent/30 blur-3xl"
                />
                {/* Phone — behind, shifted right */}
                <div className="absolute left-[380px] top-[6px] z-0 animate-floaty">
                  <PhoneFrame variant="order" />
                </div>
                {/* Tablet (landscape) — in front */}
                <div className="absolute left-[10px] top-[150px] z-10">
                  <TabletFrame />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
