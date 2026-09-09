import type { Dict } from '../lib/i18n';
import { WEB_APP_URL } from '../lib/i18n';
import { Icon } from './icons';
import { PhoneFrame, TabletFrame } from './DeviceFrame';
import { StoreBadges } from './StoreBadges';
import { AudienceToggle } from './AudienceToggle';

export function Hero({ d }: { d: Dict }) {
  const c = d.audience.customerHero;
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-8 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-16">
        <div>
          {/* The nav toggle is desktop-only (header space at 375px), so the hero
              carries the audience switch on phones. */}
          <div className="mb-6 md:hidden">
            <AudienceToggle
              tailorLabel={d.audience.toggle.tailor}
              customerLabel={d.audience.toggle.customer}
            />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/70 px-3 py-1 text-xs font-medium text-brand-muted">
            <Icon name="spark" className="h-3.5 w-3.5 text-audience" />
            <span className="t-only">{d.hero.eyebrow}</span>
            <span className="c-only">{c.eyebrow}</span>
          </span>

          <h1 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-brand-ink sm:text-5xl lg:text-6xl">
            <span className="t-only">{d.hero.title}</span>
            <span className="c-only">{c.title}</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-muted">
            <span className="t-only">{d.hero.subtitle}</span>
            <span className="c-only">{c.subtitle}</span>
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={WEB_APP_URL || '#get-app'}
              className="inline-flex items-center gap-2 rounded-full bg-audience px-6 py-3 text-base font-semibold text-white shadow-glow transition hover:bg-audienceDeep"
            >
              <span className="t-only">{d.hero.ctaPrimary}</span>
              <span className="c-only">{c.ctaPrimary}</span>
              <Icon name="arrow" className="h-4 w-4" />
            </a>
            {/* Secondary points at the narrative the visitor can actually see:
                tailors get the "how it works" walkthrough, customers the loop. */}
            <a
              href="#how"
              className="t-only items-center rounded-full border border-brand-border bg-brand-surface/60 px-6 py-3 text-base font-semibold text-brand-ink transition hover:bg-brand-surface"
            >
              {d.hero.ctaSecondary}
            </a>
            <a
              href="#loop"
              className="c-only items-center rounded-full border border-brand-border bg-brand-surface/60 px-6 py-3 text-base font-semibold text-brand-ink transition hover:bg-brand-surface"
            >
              {d.hero.ctaSecondary}
            </a>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-brand-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-success" />
            <span className="t-only">{d.hero.note}</span>
            <span className="c-only">{c.note}</span>
          </p>

          {/* App-store badges are tailor-facing; customers reach the app straight
              from the primary CTA above. */}
          <div className="mt-8 t-only">
            <StoreBadges d={d} />
          </div>
        </div>

        {/* Two-device composition: a landscape tablet in front, with the phone
            shifted right and peeking out behind it. The art is drawn at a fixed
            size and scaled responsively, so it never reflows or overflows.

            Positioned with logical `start-*`, so the whole composition mirrors
            under RTL — but the screenshots inside the frames do not, because
            mirrored app chrome would be a lie about what the app looks like. */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative h-[259px] w-[307px] sm:h-[367px] sm:w-[435px] lg:h-[432px] lg:w-[512px] xl:h-[513px] xl:w-[608px]">
            <div className="absolute start-0 top-0 origin-top-left scale-[0.48] rtl:origin-top-right sm:scale-[0.68] lg:scale-[0.80] xl:scale-[0.95]">
              <div className="relative h-[540px] w-[640px]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 transform-gpu rounded-[80px] bg-gradient-to-tr from-audience/50 via-audienceLight/40 to-audience/20 blur-3xl rtl:bg-gradient-to-tl"
                />
                {/* Phone — behind, shifted toward the inline end */}
                <div className="absolute start-[380px] top-[6px] z-0 animate-floaty">
                  <PhoneFrame alt={d.gallery.altPhone} />
                </div>
                {/* Tablet (landscape) — in front */}
                <div className="absolute start-[10px] top-[150px] z-10">
                  <TabletFrame alt={d.gallery.altTablet} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
