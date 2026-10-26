// The question asked once before anything is sent to the AI provider
// (lib/ai-consent.ts). Referenced as t('aiConsent.key').
export const aiConsent = {
  en: {
    title: 'Use SeamFlow’s AI features?',
    body: 'To do this, SeamFlow sends what you chose (a photo or your text, and for the assistant the clients, orders and measurements it looks up) to Anthropic, the company that runs the AI. It is used only to give you the answer and is not used to train their models. You can say no and keep using everything else.',
    allow: 'Allow',
    readPolicy: 'Read the privacy policy',
    decline: 'Not now',
  },
  fr: {
    title: 'Utiliser les fonctions IA de SeamFlow ?',
    body: 'Pour cela, SeamFlow envoie ce que vous avez choisi (une photo ou votre texte et, pour l’assistant, les clients, commandes et mesures qu’il consulte) à Anthropic, l’entreprise qui fait fonctionner l’IA. Ces données servent uniquement à vous répondre et ne servent pas à entraîner leurs modèles. Vous pouvez refuser et continuer à utiliser tout le reste.',
    allow: 'Autoriser',
    readPolicy: 'Lire la politique de confidentialité',
    decline: 'Pas maintenant',
  },
  pt: {
    title: 'Usar as funcionalidades de IA do SeamFlow?',
    body: 'Para isso, o SeamFlow envia o que escolheu (uma foto ou o seu texto e, no caso do assistente, os clientes, encomendas e medidas que consulta) à Anthropic, a empresa que gere a IA. Serve apenas para lhe dar a resposta e não é usado para treinar os modelos deles. Pode recusar e continuar a usar tudo o resto.',
    allow: 'Permitir',
    readPolicy: 'Ler a política de privacidade',
    decline: 'Agora não',
  },
  es: {
    title: '¿Usar las funciones de IA de SeamFlow?',
    body: 'Para ello, SeamFlow envía lo que elegiste (una foto o tu texto y, en el caso del asistente, los clientes, pedidos y medidas que consulta) a Anthropic, la empresa que opera la IA. Se usa solo para darte la respuesta y no se usa para entrenar sus modelos. Puedes decir que no y seguir usando todo lo demás.',
    allow: 'Permitir',
    readPolicy: 'Leer la política de privacidad',
    decline: 'Ahora no',
  },
  sw: {
    title: 'Tumia vipengele vya AI vya SeamFlow?',
    body: 'Ili kufanya hivi, SeamFlow hutuma ulichochagua (picha au maandishi yako, na kwa msaidizi, wateja, oda na vipimo anavyotafuta) kwa Anthropic, kampuni inayoendesha AI. Hutumika tu kukupa jibu na haitumiki kufunza mifumo yao. Unaweza kukataa na kuendelea kutumia kila kitu kingine.',
    allow: 'Ruhusu',
    readPolicy: 'Soma sera ya faragha',
    decline: 'Si sasa',
  },
  ar: {
    title: 'استخدام ميزات الذكاء الاصطناعي في SeamFlow؟',
    body: 'لتنفيذ ذلك، يرسل SeamFlow ما اخترته (صورة أو نصك، وبالنسبة للمساعد: العملاء والطلبات والمقاسات التي يبحث عنها) إلى Anthropic، الشركة التي تشغّل الذكاء الاصطناعي. تُستخدم فقط لإعطائك الإجابة ولا تُستخدم لتدريب نماذجها. يمكنك الرفض ومواصلة استخدام كل ما عدا ذلك.',
    allow: 'السماح',
    readPolicy: 'قراءة سياسة الخصوصية',
    decline: 'ليس الآن',
  },
} as const;
