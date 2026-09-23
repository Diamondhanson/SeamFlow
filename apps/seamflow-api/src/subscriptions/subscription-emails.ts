// ============================================================================
// What a subscription email says, in six languages.
//
// This is the only place SeamFlow is allowed to sell. The apps on the stores
// may report status and nothing else, so an email is how a tailor learns what
// premium costs and where to get it — and for an iPhone tailor it is the only
// way they will ever find out.
//
// Written accordingly: the news first, the price second, one link, and the
// promise that nothing they made is at risk. No urgency tricks; a tailor who
// feels cornered by an email about money does not come back.
// ============================================================================

import { planFor, type BillingOptions, type SubscriptionPlan } from '@seamflow/schemas';

export interface ReminderContext {
  /** Whole days until the trial or paid period ends. 0 means today. */
  days: number;
  /** True when this is paid time running out rather than the free trial. */
  paid: boolean;
  billing: BillingOptions;
  /** Where the plans live, already carrying any tracking we need. */
  url: string;
}

function price(billing: BillingOptions, plan: SubscriptionPlan): string {
  const amount = billing.prices[plan];
  return billing.currency === 'XAF'
    ? `${amount.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`
    : `$${amount}`;
}

/** "3,000 FCFA a month, or 25,500 FCFA a year" — the two ends of the choice. */
function priceLine(billing: BillingOptions, perMonth: string, perYear: string): string {
  return `${price(billing, 'monthly')} ${perMonth}, ${price(billing, 'annual')} ${perYear}`;
}

export interface EmailCopy {
  subject: string;
  text: string;
}

type Builder = (c: ReminderContext) => EmailCopy;

const BUILDERS: Record<string, Builder> = {
  en: (c) => {
    const what = c.paid ? 'subscription' : 'free trial';
    const when =
      c.days === 0 ? `ends today` : c.days === 1 ? `ends tomorrow` : `ends in ${c.days} days`;
    return {
      subject: `Your SeamFlow ${what} ${when}`,
      text: [
        `Your SeamFlow ${what} ${when}.`,
        '',
        'Everything you have saved stays yours either way: your clients, their measurements and every order remain in the app, and you can keep taking orders on the free plan.',
        '',
        `To keep group orders, invoices, the measurement scan and unlimited clients, a subscription is ${priceLine(c.billing, 'a month', 'a year')}.`,
        '',
        `See the plans and subscribe: ${c.url}`,
        '',
        'Thank you for building your business with SeamFlow.',
      ].join('\n'),
    };
  },
  fr: (c) => {
    const what = c.paid ? 'abonnement' : 'essai gratuit';
    const when =
      c.days === 0 ? `se termine aujourd’hui` : c.days === 1 ? `se termine demain` : `se termine dans ${c.days} jours`;
    return {
      subject: `Votre ${what} SeamFlow ${when}`,
      text: [
        `Votre ${what} SeamFlow ${when}.`,
        '',
        'Dans tous les cas, tout ce que vous avez enregistré reste à vous : vos clients, leurs mesures et toutes vos commandes restent dans l’application, et vous pouvez continuer à prendre des commandes avec le forfait gratuit.',
        '',
        `Pour garder les commandes groupées, les factures, le scan des mesures et les clients illimités, l’abonnement est à ${priceLine(c.billing, 'par mois', 'par an')}.`,
        '',
        `Voir les forfaits et s’abonner : ${c.url}`,
        '',
        'Merci de faire grandir votre activité avec SeamFlow.',
      ].join('\n'),
    };
  },
  pt: (c) => {
    const what = c.paid ? 'subscrição' : 'período gratuito';
    const when =
      c.days === 0 ? `termina hoje` : c.days === 1 ? `termina amanhã` : `termina em ${c.days} dias`;
    return {
      subject: `A sua ${what} SeamFlow ${when}`,
      text: [
        `A sua ${what} SeamFlow ${when}.`,
        '',
        'De qualquer forma, tudo o que guardou continua seu: os seus clientes, as medidas e todas as encomendas ficam na aplicação, e pode continuar a aceitar encomendas no plano gratuito.',
        '',
        `Para manter encomendas de grupo, faturas, a leitura de medidas e clientes ilimitados, a subscrição custa ${priceLine(c.billing, 'por mês', 'por ano')}.`,
        '',
        `Ver os planos e subscrever: ${c.url}`,
        '',
        'Obrigado por fazer crescer o seu negócio com a SeamFlow.',
      ].join('\n'),
    };
  },
  es: (c) => {
    const what = c.paid ? 'suscripción' : 'prueba gratuita';
    const when =
      c.days === 0 ? `termina hoy` : c.days === 1 ? `termina mañana` : `termina en ${c.days} días`;
    return {
      subject: `Tu ${what} de SeamFlow ${when}`,
      text: [
        `Tu ${what} de SeamFlow ${when}.`,
        '',
        'En cualquier caso, todo lo que guardaste sigue siendo tuyo: tus clientes, sus medidas y todos los pedidos siguen en la app, y puedes seguir tomando pedidos con el plan gratis.',
        '',
        `Para mantener los pedidos de grupo, las facturas, el escaneo de medidas y clientes ilimitados, la suscripción cuesta ${priceLine(c.billing, 'al mes', 'al año')}.`,
        '',
        `Ver los planes y suscribirte: ${c.url}`,
        '',
        'Gracias por hacer crecer tu negocio con SeamFlow.',
      ].join('\n'),
    };
  },
  sw: (c) => {
    const what = c.paid ? 'usajili' : 'jaribio la bure';
    const when =
      c.days === 0 ? `unaisha leo` : c.days === 1 ? `unaisha kesho` : `unaisha baada ya siku ${c.days}`;
    return {
      subject: `${what === 'usajili' ? 'Usajili' : 'Jaribio'} lako la SeamFlow ${when}`,
      text: [
        `${what === 'usajili' ? 'Usajili' : 'Jaribio'} lako la SeamFlow ${when}.`,
        '',
        'Vyovyote vile, kila ulichohifadhi kinabaki chako: wateja wako, vipimo vyao na oda zote zinabaki kwenye programu, na unaweza kuendelea kupokea oda kwa mpango wa bure.',
        '',
        `Ili kubaki na oda za kikundi, ankara, kusoma vipimo na wateja bila kikomo, usajili ni ${priceLine(c.billing, 'kwa mwezi', 'kwa mwaka')}.`,
        '',
        `Angalia mipango na ujisajili: ${c.url}`,
        '',
        'Asante kwa kukuza biashara yako na SeamFlow.',
      ].join('\n'),
    };
  },
  ar: (c) => {
    const what = c.paid ? 'اشتراكك' : 'فترتك التجريبية';
    const when =
      c.days === 0 ? 'ينتهي اليوم' : c.days === 1 ? 'ينتهي غدًا' : `ينتهي خلال ${c.days} أيام`;
    return {
      subject: `${what} في SeamFlow ${when}`,
      text: [
        `${what} في SeamFlow ${when}.`,
        '',
        'في كل الأحوال يبقى كل ما حفظته لك: عملاؤك ومقاساتهم وكل الطلبات تبقى في التطبيق، ويمكنك الاستمرار في استقبال الطلبات على الخطة المجانية.',
        '',
        `للاحتفاظ بالطلبات الجماعية والفواتير وقياس المقاسات والعملاء بلا حدود، الاشتراك ${priceLine(c.billing, 'شهريًا', 'سنويًا')}.`,
        '',
        `اطّلع على الخطط واشترك: ${c.url}`,
        '',
        'شكرًا لتنمية عملك مع SeamFlow.',
      ].join('\n'),
    };
  },
};

export function reminderEmail(language: string, ctx: ReminderContext): EmailCopy {
  return (BUILDERS[language] ?? BUILDERS.en!)(ctx);
}

/** Days per plan, used when an email needs to quote a length. */
export const planDays = (plan: SubscriptionPlan): number => planFor(plan).days;
