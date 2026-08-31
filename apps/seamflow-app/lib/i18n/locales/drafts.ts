// Unsaved-work rescue. Shown when a tailor returns to a screen they were
// interrupted on — see lib/drafts.ts. The copy is deliberately reassuring and
// never blames: being interrupted mid-measurement is normal, not a mistake.
//
// The `ago*` strings are fragments, not sentences. English carries "ago"
// inside the fragment ("5 minutes ago"); French puts it in front of the
// fragment ("il y a 5 minutes"), so the French sentences supply "il y a" and
// the fragment stays a bare duration. Singular forms are separate keys rather
// than a plural rule — two languages and three units is not worth a plural
// engine, and "1 minutes ago" is exactly the kind of sloppiness a tailor
// notices.
export const drafts = {
  en: {
    resumeTitle: 'Pick up where you left off?',
    // {what} is who or what was being worked on; {ago} is "5 minutes ago".
    resumeBodyNamed: 'You were working on {what} {ago} and did not save. Everything you typed is still here.',
    resumeBody: 'You had unsaved work from {ago}. Everything you typed is still here.',
    resumeConfirm: 'Continue',
    resumeDiscard: 'Start fresh',

    agoMinute: 'a minute ago',
    agoMinutes: '{count} minutes ago',
    agoHour: 'an hour ago',
    agoHours: '{count} hours ago',
    agoDay: 'yesterday',
    agoDays: '{count} days ago',

    // Leaving a screen with unsaved measurements.
    leaveTitle: 'Leave without saving?',
    leaveBody: 'Your measurements are kept on this device, so you can come back to them. They will not reach your records until you save.',
    leaveConfirm: 'Leave',
    leaveStay: 'Keep editing',

    // Quiet reassurance beside a form that is being kept automatically.
    keptOnDevice: 'Kept on this device as you type',
  },
  fr: {
    resumeTitle: 'Reprendre où vous en étiez ?',
    resumeBodyNamed: 'Vous travailliez sur {what} il y a {ago} sans enregistrer. Tout ce que vous avez saisi est toujours là.',
    resumeBody: 'Vous aviez un travail non enregistré d’il y a {ago}. Tout ce que vous avez saisi est toujours là.',
    resumeConfirm: 'Continuer',
    resumeDiscard: 'Recommencer',

    agoMinute: 'une minute',
    agoMinutes: '{count} minutes',
    agoHour: 'une heure',
    agoHours: '{count} heures',
    agoDay: 'un jour',
    agoDays: '{count} jours',

    leaveTitle: 'Quitter sans enregistrer ?',
    leaveBody: 'Vos mesures sont conservées sur cet appareil, vous pourrez donc y revenir. Elles n’apparaîtront dans vos dossiers qu’après enregistrement.',
    leaveConfirm: 'Quitter',
    leaveStay: 'Continuer la saisie',

    keptOnDevice: 'Conservé sur cet appareil au fur et à mesure',
  },
  pt: {
    resumeTitle: 'Retomar de onde parou?',
    resumeBodyNamed:
      'Estava a trabalhar em {what} {ago} e não guardou. Está tudo aqui como o deixou.',
    resumeBody: 'Tinha trabalho por guardar de {ago}. Está tudo aqui como o deixou.',
    resumeConfirm: 'Continuar',
    resumeDiscard: 'Começar de novo',

    // Fragmentos, não frases: em português o "há" vem antes, tal como em francês.
    agoMinute: 'há um minuto',
    agoMinutes: 'há {count} minutos',
    agoHour: 'há uma hora',
    agoHours: 'há {count} horas',
    agoDay: 'ontem',
    agoDays: 'há {count} dias',

    leaveTitle: 'Sair sem guardar?',
    leaveBody:
      'As suas medidas ficam guardadas neste dispositivo, por isso pode voltar a elas. Só entram nos seus registos depois de guardar.',
    leaveConfirm: 'Sair',
    leaveStay: 'Continuar a editar',

    keptOnDevice: 'Guardado neste dispositivo enquanto escreve',
  },
  es: {
    resumeTitle: '¿Retomar donde lo dejó?',
    resumeBodyNamed:
      'Estaba trabajando en {what} {ago} y no guardó. Todo lo que escribió sigue aquí.',
    resumeBody: 'Tenía trabajo sin guardar de {ago}. Todo lo que escribió sigue aquí.',
    resumeConfirm: 'Continuar',
    resumeDiscard: 'Empezar de nuevo',

    // Fragmentos, no frases: en español el "hace" va delante, como en francés.
    agoMinute: 'hace un minuto',
    agoMinutes: 'hace {count} minutos',
    agoHour: 'hace una hora',
    agoHours: 'hace {count} horas',
    agoDay: 'ayer',
    agoDays: 'hace {count} días',

    leaveTitle: '¿Salir sin guardar?',
    leaveBody:
      'Sus medidas quedan guardadas en este dispositivo, así que puede volver a ellas. No entran en sus registros hasta que guarde.',
    leaveConfirm: 'Salir',
    leaveStay: 'Seguir editando',

    keptOnDevice: 'Se guarda en este dispositivo mientras escribe',
  },
  sw: {
    resumeTitle: 'Uendelee pale ulipoishia?',
    resumeBodyNamed:
      'Ulikuwa unafanyia kazi {what} {ago} na hukuhifadhi. Kila ulichoandika bado kipo.',
    resumeBody: 'Ulikuwa na kazi isiyohifadhiwa ya {ago}. Kila ulichoandika bado kipo.',
    resumeConfirm: 'Endelea',
    resumeDiscard: 'Anza upya',

    // Vipande vya maneno, si sentensi kamili.
    agoMinute: 'dakika moja iliyopita',
    agoMinutes: 'dakika {count} zilizopita',
    agoHour: 'saa moja iliyopita',
    agoHours: 'saa {count} zilizopita',
    agoDay: 'jana',
    agoDays: 'siku {count} zilizopita',

    leaveTitle: 'Utoke bila kuhifadhi?',
    leaveBody:
      'Vipimo vyako vimehifadhiwa kwenye kifaa hiki, kwa hivyo unaweza kurudi. Havitaingia kwenye kumbukumbu zako mpaka uhifadhi.',
    leaveConfirm: 'Toka',
    leaveStay: 'Endelea kuhariri',

    keptOnDevice: 'Huhifadhiwa kwenye kifaa hiki unapoandika',
  },
  ar: {
    resumeTitle: 'هل تكمل من حيث توقّفت؟',
    // {what} هو ما كنت تعمل عليه؛ {ago} مثل «قبل ٥ دقائق».
    resumeBodyNamed: 'كنت تعمل على {what} {ago} ولم تحفظ. كل ما كتبته لا يزال موجودًا.',
    resumeBody: 'لديك عمل غير محفوظ من {ago}. كل ما كتبته لا يزال موجودًا.',
    resumeConfirm: 'متابعة',
    resumeDiscard: 'البدء من جديد',

    agoMinute: 'قبل دقيقة',
    agoMinutes: 'قبل {count} دقائق',
    agoHour: 'قبل ساعة',
    agoHours: 'قبل {count} ساعات',
    agoDay: 'أمس',
    agoDays: 'قبل {count} أيام',

    // مغادرة شاشة فيها مقاسات غير محفوظة.
    leaveTitle: 'تغادر دون حفظ؟',
    leaveBody: 'مقاساتك محفوظة على هذا الجهاز، فيمكنك العودة إليها. لكنها لن تصل إلى سجلّاتك حتى تحفظها.',
    leaveConfirm: 'مغادرة',
    leaveStay: 'متابعة التعديل',

    // طمأنة هادئة بجوار نموذج يُحفظ تلقائيًا.
    keptOnDevice: 'يُحفظ على هذا الجهاز أثناء الكتابة',
  },
};
