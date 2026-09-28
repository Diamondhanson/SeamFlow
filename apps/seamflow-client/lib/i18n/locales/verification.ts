// ============================================================================
// The verified mark, as a CLIENT reads it (appendix J.5).
//
// A client never verifies anything, so this namespace has none of the tailor's
// submission copy — only the sentence behind the tick. The footnote is the
// load-bearing part: people read a mark like this as an endorsement of skill,
// and it is not one. Saying so plainly is what keeps the badge honest.
// ============================================================================

export const verification = {
  en: {
    badgeTitle: 'Verified shop',
    badgeWork: 'SeamFlow has confirmed the work in this shop is their own.',
    badgeWorkOn: 'SeamFlow confirmed the work in this shop is their own, {date}.',
    badgePhone: 'Their phone number is confirmed, so they can be reached.',
    badgeSince: 'On SeamFlow since {date}.',
    badgeFootnote: 'This is not a rating. It means we checked the shop is real, not that we judged their work.',
  },
  fr: {
    badgeTitle: 'Atelier vérifié',
    badgeWork: 'SeamFlow a confirmé que le travail de cet atelier est bien le sien.',
    badgeWorkOn: 'SeamFlow a confirmé que le travail de cet atelier est bien le sien, en {date}.',
    badgePhone: 'Son numéro de téléphone est confirmé : on peut la joindre.',
    badgeSince: 'Sur SeamFlow depuis {date}.',
    badgeFootnote: 'Ce n’est pas une note. Cela veut dire que nous avons vérifié que l’atelier est réel, pas que nous avons jugé son travail.',
  },
  pt: {
    badgeTitle: 'Oficina verificada',
    badgeWork: 'A SeamFlow confirmou que o trabalho desta oficina é mesmo dela.',
    badgeWorkOn: 'A SeamFlow confirmou que o trabalho desta oficina é mesmo dela, em {date}.',
    badgePhone: 'O número de telefone está confirmado, por isso é possível contactá-la.',
    badgeSince: 'Na SeamFlow desde {date}.',
    badgeFootnote: 'Isto não é uma classificação. Significa que verificámos que a oficina é real, não que avaliámos o trabalho.',
  },
  es: {
    badgeTitle: 'Taller verificado',
    badgeWork: 'SeamFlow ha confirmado que el trabajo de este taller es suyo.',
    badgeWorkOn: 'SeamFlow confirmó que el trabajo de este taller es suyo, en {date}.',
    badgePhone: 'Su número de teléfono está confirmado, así que se le puede contactar.',
    badgeSince: 'En SeamFlow desde {date}.',
    badgeFootnote: 'Esto no es una valoración. Significa que comprobamos que el taller es real, no que juzgamos su trabajo.',
  },
  sw: {
    badgeTitle: 'Duka lililothibitishwa',
    badgeWork: 'SeamFlow imethibitisha kuwa kazi ya duka hili ni yao wenyewe.',
    badgeWorkOn: 'SeamFlow ilithibitisha kuwa kazi ya duka hili ni yao wenyewe, {date}.',
    badgePhone: 'Namba yao ya simu imethibitishwa, hivyo wanaweza kupatikana.',
    badgeSince: 'Kwenye SeamFlow tangu {date}.',
    badgeFootnote: 'Hii si alama ya ubora. Inamaanisha tumethibitisha duka ni halisi, si kwamba tumepima kazi yao.',
  },
  ar: {
    badgeTitle: 'ورشة موثَّقة',
    badgeWork: 'أكّدت SeamFlow أنّ العمل في هذه الورشة من صنعها.',
    badgeWorkOn: 'أكّدت SeamFlow أنّ العمل في هذه الورشة من صنعها، في {date}.',
    badgePhone: 'رقم هاتفها مؤكَّد، ويمكن الوصول إليها.',
    badgeSince: 'على SeamFlow منذ {date}.',
    badgeFootnote: 'هذا ليس تقييمًا. معناه أنّنا تحقّقنا من أنّ الورشة حقيقية، لا أنّنا حكمنا على عملها.',
  },
} as const;
