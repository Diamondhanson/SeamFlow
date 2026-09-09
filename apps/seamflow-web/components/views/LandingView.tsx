// The landing page body, rendered by both `/` (English) and `/fr` (French).
// Kept out of the route files so the two languages can never drift apart.

import type { Lang } from '../../lib/i18n';
import { getDict } from '../../lib/i18n';
import { Nav } from '../Nav';
import { Hero } from '../Hero';
import { Loop } from '../Loop';
import {
  Problem,
  Features,
  AssistantSpotlight,
  Steps,
  Vision,
  Gallery,
  Cta,
} from '../Sections';
import { Faq } from '../Faq';
import { Footer } from '../Footer';
import { FaqLd, OrganizationLd, SoftwareApplicationLd } from '../JsonLd';

export function LandingView({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  const year = new Date().getFullYear();

  return (
    // `lang` on the wrapper, not just <html>: only the root layout can set the
    // document language, and it's shared by both trees. Screen readers and
    // translation tools honour the nearest lang ancestor, so this gives the
    // French page correct pronunciation.
    <div className="marketing min-h-screen" lang={lang}>
      <OrganizationLd />
      <SoftwareApplicationLd d={d} lang={lang} />
      <FaqLd d={d} />
      <Nav d={d} lang={lang} />
      <main>
        <Hero d={d} />
        {/* The loop band is the one section both audiences always see — it's
            where the two-sided story is told in both colours. */}
        <Loop d={d} />
        {/* Tailor-facing narrative. Hidden for customers (who get the hero, the
            loop, the gallery and their own CTA); customer-specific copy for
            these sections is the next phase. */}
        <div className="t-only">
          <Problem d={d} />
          <Features d={d} />
          <AssistantSpotlight d={d} lang={lang} />
          <Steps d={d} />
          <Vision d={d} />
        </div>
        <Gallery d={d} />
        <div className="t-only">
          <Faq d={d} lang={lang} />
        </div>
        <Cta d={d} />
      </main>
      <Footer d={d} lang={lang} year={year} />
    </div>
  );
}
