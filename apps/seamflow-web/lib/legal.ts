// ============================================================================
// Legal page content (Privacy Policy + Terms), EN/FR. Kept out of components
// so wording is easy to edit. Rendered by app/privacy and app/terms.
//
// These are PUBLISHED, not drafts: Google Play's Data safety form points at
// /privacy, so this is the document a reviewer reads and a user is bound by.
// It has not been through a lawyer. Treat edits accordingly, and bump
// LEGAL_UPDATED whenever the substance changes — the date is shown on the page.
// ============================================================================

import type { Lang } from './i18n';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}
export interface LegalDoc {
  intro: string;
  sections: LegalSection[];
}

/** ISO date shown as "Last updated" on both legal pages. */
export const LEGAL_UPDATED = '2026-08-13';

export const privacy: Record<Lang, LegalDoc> = {
  en: {
    intro:
      'This Privacy Policy explains what SeamFlow ("we", "us") collects, how we use it, and the choices you have. SeamFlow is a tool for tailors and fashion designers to manage clients, measurements and orders.',
    sections: [
      {
        heading: '1. Information we collect',
        paragraphs: [
          'Account information: the email address and/or phone number you sign up with, your business name, and your language, currency and country preferences.',
          'Data you enter about your work: your clients’ names, phone numbers, addresses and measurements; order details, notes and dates; group orders and their members; fabrics; and any photos you upload (reference images, fabric swatches, design inspiration and finished-work photos).',
          'Device & usage data: a push-notification token so we can send reminders, basic device and app information, and standard logs used to keep the service running and to diagnose problems.',
        ],
      },
      {
        heading: '2. How we use your information',
        paragraphs: [
          'To provide the core service: storing and syncing your clients, orders and measurements across your devices.',
          'To send the notifications and reminders you have enabled (for example, upcoming fittings and delivery dates).',
          'To provide support, keep the service secure, prevent abuse, and improve how SeamFlow works.',
          'We do not sell your personal information, and we do not use the content you enter to advertise to you.',
        ],
      },
      {
        heading: '3. Service providers',
        paragraphs: [
          'We rely on a small number of trusted providers to run SeamFlow: Supabase (database, authentication and file storage), Expo (push-notification delivery), and Upstash (background job queues).',
          'If you use the optional AI "describe image" feature, the specific image you choose is sent to Anthropic to generate design notes. This only happens when you actively use that feature.',
          'These providers process data on our behalf under their own security and privacy commitments.',
        ],
      },
      {
        heading: '4. Data about your clients',
        paragraphs: [
          'The client information you enter is data you control. You are responsible for having a proper basis to collect and store your clients’ details, and for how you use them.',
          'We process that information on your behalf, solely to provide SeamFlow to you.',
        ],
      },
      {
        heading: '5. Storage, location and retention',
        paragraphs: [
          'Your data is stored on our providers’ cloud infrastructure. It may be processed in countries other than your own; where that happens we rely on appropriate safeguards.',
          'We keep your data while your account is active. When you ask us to delete your account, your public page stops being visible immediately and everything is erased 30 days later. The delay exists so you can change your mind: sign in at any point during those 30 days and choose “Keep my account” to cancel. After that it is permanent and we cannot recover it for you.',
          'Two things outlast a deletion, and neither identifies you. Messages you sent stay in the other person’s conversation with your name and their contents removed, so their side of the thread still makes sense. And we keep records that identify nobody where they are needed to keep the service working for other people.',
        ],
      },
      {
        heading: '6. Your rights',
        paragraphs: [
          'You can access, correct, export or delete your data. To delete your account, open the app and go to Settings → Account → Delete my account, which also offers you a copy of everything to download first. If you no longer have the app installed, seamflowtech.com/delete-account explains how to ask us instead. For anything else, email us and we will help.',
          'Depending on where you live, you may have additional rights under local law (such as the right to object to or restrict certain processing).',
        ],
      },
      {
        heading: '7. Security',
        paragraphs: [
          'We protect your data with encryption in transit, access controls, and an optional on-device PIN lock. No method of transmission or storage is ever 100% secure, but we work to protect your information and to respond quickly to any issue.',
        ],
      },
      {
        heading: '8. Children',
        paragraphs: [
          'SeamFlow is a business tool and is not directed to children. We do not knowingly collect personal information from children under 16.',
        ],
      },
      {
        heading: '9. Changes to this policy',
        paragraphs: [
          'We may update this policy as SeamFlow evolves. The "last updated" date at the top reflects the latest version, and we will make reasonable efforts to notify you of material changes.',
        ],
      },
      {
        heading: '10. Contact',
        paragraphs: [
          'Questions about privacy? Email us at contactseamflow@gmail.com and we’ll get back to you.',
        ],
      },
    ],
  },
  fr: {
    intro:
      'Cette Politique de confidentialité explique ce que SeamFlow (« nous ») collecte, comment nous l’utilisons et les choix dont vous disposez. SeamFlow est un outil destiné aux tailleurs et créateurs pour gérer clients, mesures et commandes.',
    sections: [
      {
        heading: '1. Informations que nous collectons',
        paragraphs: [
          'Informations de compte : l’adresse e-mail et/ou le numéro de téléphone d’inscription, le nom de votre entreprise, ainsi que vos préférences de langue, de devise et de pays.',
          'Données que vous saisissez sur votre activité : les noms, numéros, adresses et mesures de vos clients ; les détails, notes et dates de commande ; les commandes de groupe et leurs membres ; les tissus ; et toutes les photos que vous téléversez (images de référence, échantillons de tissu, inspirations, photos de réalisations).',
          'Données d’appareil et d’usage : un jeton de notification pour envoyer les rappels, des informations de base sur l’appareil et l’application, et des journaux standard servant au bon fonctionnement du service et au diagnostic.',
        ],
      },
      {
        heading: '2. Comment nous utilisons vos informations',
        paragraphs: [
          'Pour fournir le service : stocker et synchroniser vos clients, commandes et mesures entre vos appareils.',
          'Pour envoyer les notifications et rappels que vous avez activés (par exemple, essayages et dates de livraison à venir).',
          'Pour l’assistance, la sécurité du service, la prévention des abus et l’amélioration de SeamFlow.',
          'Nous ne vendons pas vos informations personnelles et n’utilisons pas votre contenu à des fins publicitaires.',
        ],
      },
      {
        heading: '3. Prestataires',
        paragraphs: [
          'Nous nous appuyons sur quelques prestataires de confiance : Supabase (base de données, authentification, stockage de fichiers), Expo (notifications) et Upstash (files de tâches en arrière-plan).',
          'Si vous utilisez la fonction facultative d’IA « décrire une image », l’image que vous choisissez est envoyée à Anthropic pour générer des notes de conception. Cela n’a lieu que lorsque vous utilisez activement cette fonction.',
          'Ces prestataires traitent les données pour notre compte, selon leurs propres engagements de sécurité et de confidentialité.',
        ],
      },
      {
        heading: '4. Données concernant vos clients',
        paragraphs: [
          'Les informations client que vous saisissez sont des données que vous contrôlez. Vous êtes responsable de disposer d’une base appropriée pour les collecter et les conserver, ainsi que de leur usage.',
          'Nous traitons ces informations pour votre compte, uniquement afin de vous fournir SeamFlow.',
        ],
      },
      {
        heading: '5. Stockage, localisation et conservation',
        paragraphs: [
          'Vos données sont stockées sur l’infrastructure cloud de nos prestataires. Elles peuvent être traitées dans des pays autres que le vôtre ; le cas échéant, nous appliquons des garanties appropriées.',
          'Nous conservons vos données tant que votre compte est actif. Lorsque vous demandez la suppression de votre compte, votre page publique cesse d’être visible immédiatement et tout est effacé 30 jours plus tard. Ce délai existe pour vous permettre de changer d’avis : connectez-vous à tout moment pendant ces 30 jours et choisissez « Garder mon compte » pour annuler. Passé ce délai, c’est définitif et nous ne pouvons rien récupérer.',
          'Deux choses survivent à une suppression, et aucune ne vous identifie. Les messages que vous avez envoyés restent dans la conversation de l’autre personne, sans votre nom ni leur contenu, afin que son fil de discussion reste compréhensible. Et nous conservons des enregistrements qui n’identifient personne lorsqu’ils sont nécessaires au fonctionnement du service pour les autres.',
        ],
      },
      {
        heading: '6. Vos droits',
        paragraphs: [
          'Vous pouvez consulter, corriger, exporter ou supprimer vos données. Pour supprimer votre compte, ouvrez l’application et allez dans Paramètres → Compte → Supprimer mon compte, qui vous propose aussi de télécharger une copie de tout au préalable. Si vous n’avez plus l’application installée, seamflowtech.com/delete-account explique comment nous en faire la demande. Pour le reste, écrivez-nous et nous vous aiderons.',
          'Selon votre lieu de résidence, vous pouvez disposer de droits supplémentaires prévus par la loi locale (comme le droit de vous opposer à certains traitements ou de les limiter).',
        ],
      },
      {
        heading: '7. Sécurité',
        paragraphs: [
          'Nous protégeons vos données par le chiffrement en transit, des contrôles d’accès et un verrou par code PIN facultatif sur l’appareil. Aucune méthode n’est sûre à 100 %, mais nous œuvrons à protéger vos informations et à réagir rapidement en cas de problème.',
        ],
      },
      {
        heading: '8. Enfants',
        paragraphs: [
          'SeamFlow est un outil professionnel qui ne s’adresse pas aux enfants. Nous ne collectons pas sciemment de données personnelles de mineurs de moins de 16 ans.',
        ],
      },
      {
        heading: '9. Modifications de cette politique',
        paragraphs: [
          'Nous pouvons mettre à jour cette politique à mesure que SeamFlow évolue. La date de « dernière mise à jour » en haut reflète la version la plus récente, et nous ferons des efforts raisonnables pour vous informer des changements importants.',
        ],
      },
      {
        heading: '10. Contact',
        paragraphs: [
          'Des questions sur la confidentialité ? Écrivez-nous à contactseamflow@gmail.com.',
        ],
      },
    ],
  },
  pt: {
    intro:
      'Esta Política de Privacidade explica o que o SeamFlow («nós») recolhe, como o utilizamos e que escolhas tem. O SeamFlow é uma ferramenta para alfaiates e criadores de moda gerirem clientes, medidas e encomendas.',
    sections: [
      {
        heading: '1. Informação que recolhemos',
        paragraphs: [
          'Dados da conta: o endereço de e-mail e/ou número de telefone com que se regista, o nome do seu negócio e as suas preferências de idioma, moeda e país.',
          'Dados que introduz sobre o seu trabalho: nomes, números de telefone, moradas e medidas dos seus clientes; detalhes, notas e datas das encomendas; encomendas de grupo e os seus membros; tecidos; e quaisquer fotos que carregue (imagens de referência, amostras de tecido, inspiração de design e fotos de trabalho terminado).',
          'Dados do dispositivo e de utilização: um token de notificações para lhe podermos enviar lembretes, informação básica do dispositivo e da aplicação, e registos habituais usados para manter o serviço a funcionar e diagnosticar problemas.',
        ],
      },
      {
        heading: '2. Como usamos a sua informação',
        paragraphs: [
          'Para prestar o serviço: guardar e sincronizar os seus clientes, encomendas e medidas entre os seus dispositivos.',
          'Para enviar as notificações e lembretes que ativou (por exemplo, provas e datas de entrega próximas).',
          'Para dar apoio, manter o serviço seguro, prevenir abusos e melhorar o funcionamento do SeamFlow.',
          'Não vendemos a sua informação pessoal e não usamos o conteúdo que introduz para lhe fazer publicidade.',
        ],
      },
      {
        heading: '3. Prestadores de serviços',
        paragraphs: [
          'Recorremos a um número reduzido de prestadores de confiança para operar o SeamFlow: Supabase (base de dados, autenticação e armazenamento de ficheiros), Expo (entrega de notificações) e Upstash (filas de tarefas em segundo plano).',
          'Se utilizar a funcionalidade opcional de IA «descrever imagem», a imagem que escolher é enviada à Anthropic para gerar notas de design. Isto só acontece quando utiliza ativamente essa funcionalidade.',
          'Estes prestadores tratam os dados em nosso nome, ao abrigo dos seus próprios compromissos de segurança e privacidade.',
        ],
      },
      {
        heading: '4. Dados sobre os seus clientes',
        paragraphs: [
          'A informação de clientes que introduz é sua e está sob o seu controlo. É da sua responsabilidade ter fundamento adequado para recolher e guardar os dados dos seus clientes, e para a utilização que lhes dá.',
          'Tratamos essa informação em seu nome, exclusivamente para lhe prestar o SeamFlow.',
        ],
      },
      {
        heading: '5. Armazenamento, localização e conservação',
        paragraphs: [
          'Os seus dados são guardados na infraestrutura na nuvem dos nossos prestadores. Podem ser tratados em países diferentes do seu; quando isso acontece, apoiamo-nos em salvaguardas adequadas.',
          'Conservamos os seus dados enquanto a sua conta estiver ativa. Quando nos pede para eliminar a conta, a sua página pública deixa de estar visível imediatamente e tudo é apagado 30 dias depois. O atraso existe para poder mudar de ideias: inicie sessão a qualquer momento durante esses 30 dias e escolha «Manter a minha conta» para cancelar. Depois disso é definitivo e não conseguimos recuperar.',
          'Duas coisas sobrevivem a uma eliminação, e nenhuma delas o identifica. As mensagens que enviou permanecem na conversa da outra pessoa, sem o seu nome e sem o conteúdo, para que o lado dela da conversa continue a fazer sentido. E conservamos registos que não identificam ninguém, quando são necessários para manter o serviço a funcionar para outras pessoas.',
        ],
      },
      {
        heading: '6. Os seus direitos',
        paragraphs: [
          'Pode aceder, corrigir, exportar ou eliminar os seus dados. Para eliminar a conta, abra a aplicação e vá a Definições → Conta → Eliminar a minha conta, onde também lhe é oferecida uma cópia de tudo para transferir primeiro. Se já não tiver a aplicação instalada, seamflowtech.com/delete-account explica como nos pedir. Para tudo o resto, escreva-nos e ajudaremos.',
          'Consoante o local onde vive, poderá ter direitos adicionais ao abrigo da lei local (como o direito de se opor a determinados tratamentos ou de os limitar).',
        ],
      },
      {
        heading: '7. Segurança',
        paragraphs: [
          'Protegemos os seus dados com encriptação em trânsito, controlos de acesso e um bloqueio opcional por PIN no dispositivo. Nenhum método de transmissão ou armazenamento é 100% seguro, mas trabalhamos para proteger a sua informação e responder rapidamente a qualquer problema.',
        ],
      },
      {
        heading: '8. Crianças',
        paragraphs: [
          'O SeamFlow é uma ferramenta profissional e não se dirige a crianças. Não recolhemos conscientemente informação pessoal de menores de 16 anos.',
        ],
      },
      {
        heading: '9. Alterações a esta política',
        paragraphs: [
          'Podemos atualizar esta política à medida que o SeamFlow evolui. A data de «última atualização» no topo reflete a versão mais recente e faremos esforços razoáveis para o informar de alterações materiais.',
        ],
      },
      {
        heading: '10. Contacto',
        paragraphs: [
          'Dúvidas sobre privacidade? Escreva-nos para contactseamflow@gmail.com e responderemos.',
        ],
      },
    ],
  },
};

export const terms: Record<Lang, LegalDoc> = {
  en: {
    intro:
      'These Terms govern your use of SeamFlow. By creating an account or using the app, you agree to them.',
    sections: [
      {
        heading: '1. The service',
        paragraphs: [
          'SeamFlow is a tool for managing tailoring clients, measurements, orders and related work. It is in active development and features may change, be added or be removed.',
        ],
      },
      {
        heading: '2. Your account',
        paragraphs: [
          'You are responsible for keeping your login credentials secure and for the activity under your account. Tell us promptly if you suspect unauthorised use.',
        ],
      },
      {
        heading: '3. Acceptable use',
        paragraphs: [
          'Use SeamFlow only for lawful purposes. Do not misuse the service, attempt to disrupt or reverse-engineer it, or use it to store or share unlawful content.',
          'You are responsible for the client and order information you enter, and for respecting the privacy and rights of the people whose details you record.',
        ],
      },
      {
        heading: '4. Your content',
        paragraphs: [
          'You keep ownership of the data you enter. You grant us the limited rights needed to host, process and display that data solely to provide SeamFlow to you.',
        ],
      },
      {
        heading: '5. Availability',
        paragraphs: [
          'We aim to keep SeamFlow reliable, but it is provided on an "as available" basis. We may modify, suspend or discontinue parts of the service, especially during early access.',
        ],
      },
      {
        heading: '6. Disclaimer',
        paragraphs: [
          'To the fullest extent permitted by law, SeamFlow is provided "as is" and "as available", without warranties of any kind, whether express or implied.',
        ],
      },
      {
        heading: '7. Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, we are not liable for any indirect, incidental, special or consequential damages, or for loss of data or profits, arising from your use of the service. Our total liability is limited to the amount you paid us in the twelve months before the claim (which may be zero during free early access).',
        ],
      },
      {
        heading: '8. Termination',
        paragraphs: [
          'You can stop using SeamFlow at any time. We may suspend or terminate access if these Terms are breached or to protect the service and its users.',
        ],
      },
      {
        heading: '9. Governing law',
        paragraphs: [
          'These Terms are governed by the laws of the jurisdiction in which SeamFlow is operated. (To be finalised before launch.)',
        ],
      },
      {
        heading: '10. Changes & contact',
        paragraphs: [
          'We may update these Terms; continued use after an update means you accept the change. Questions? Email contactseamflow@gmail.com.',
        ],
      },
    ],
  },
  fr: {
    intro:
      'Ces Conditions régissent votre utilisation de SeamFlow. En créant un compte ou en utilisant l’application, vous les acceptez.',
    sections: [
      {
        heading: '1. Le service',
        paragraphs: [
          'SeamFlow est un outil de gestion des clients, mesures, commandes et travaux de couture. Il est en développement actif et ses fonctionnalités peuvent évoluer, être ajoutées ou retirées.',
        ],
      },
      {
        heading: '2. Votre compte',
        paragraphs: [
          'Vous êtes responsable de la sécurité de vos identifiants et de l’activité sur votre compte. Prévenez-nous rapidement en cas d’utilisation non autorisée.',
        ],
      },
      {
        heading: '3. Usage acceptable',
        paragraphs: [
          'Utilisez SeamFlow uniquement à des fins licites. N’abusez pas du service, ne tentez pas de le perturber ni de le désosser, et ne l’utilisez pas pour stocker ou partager du contenu illicite.',
          'Vous êtes responsable des informations de clients et de commandes que vous saisissez, ainsi que du respect de la vie privée et des droits des personnes concernées.',
        ],
      },
      {
        heading: '4. Votre contenu',
        paragraphs: [
          'Vous restez propriétaire des données que vous saisissez. Vous nous accordez les droits limités nécessaires pour héberger, traiter et afficher ces données, uniquement afin de vous fournir SeamFlow.',
        ],
      },
      {
        heading: '5. Disponibilité',
        paragraphs: [
          'Nous cherchons à rendre SeamFlow fiable, mais il est fourni « selon disponibilité ». Nous pouvons modifier, suspendre ou interrompre des parties du service, en particulier pendant l’accès anticipé.',
        ],
      },
      {
        heading: '6. Absence de garantie',
        paragraphs: [
          'Dans toute la mesure permise par la loi, SeamFlow est fourni « tel quel » et « selon disponibilité », sans garantie d’aucune sorte, expresse ou implicite.',
        ],
      },
      {
        heading: '7. Limitation de responsabilité',
        paragraphs: [
          'Dans toute la mesure permise par la loi, nous ne sommes pas responsables des dommages indirects, accessoires, spéciaux ou consécutifs, ni de la perte de données ou de bénéfices liés à votre usage du service. Notre responsabilité totale est limitée au montant que vous nous avez versé au cours des douze mois précédant la réclamation (qui peut être nul pendant l’accès anticipé gratuit).',
        ],
      },
      {
        heading: '8. Résiliation',
        paragraphs: [
          'Vous pouvez cesser d’utiliser SeamFlow à tout moment. Nous pouvons suspendre ou résilier l’accès en cas de non-respect de ces Conditions ou pour protéger le service et ses utilisateurs.',
        ],
      },
      {
        heading: '9. Droit applicable',
        paragraphs: [
          'Ces Conditions sont régies par le droit de la juridiction où SeamFlow est exploité. (À finaliser avant le lancement.)',
        ],
      },
      {
        heading: '10. Modifications et contact',
        paragraphs: [
          'Nous pouvons mettre à jour ces Conditions ; poursuivre l’utilisation après une mise à jour vaut acceptation. Des questions ? Écrivez à contactseamflow@gmail.com.',
        ],
      },
    ],
  },
  pt: {
    intro:
      'Estes Termos regem a sua utilização do SeamFlow. Ao criar uma conta ou utilizar a aplicação, aceita-os.',
    sections: [
      {
        heading: '1. O serviço',
        paragraphs: [
          'O SeamFlow é uma ferramenta para gerir clientes de alfaiataria, medidas, encomendas e trabalho relacionado. Está em desenvolvimento ativo e as funcionalidades podem mudar, ser acrescentadas ou removidas.',
        ],
      },
      {
        heading: '2. A sua conta',
        paragraphs: [
          'É responsável por manter seguras as suas credenciais de acesso e pela atividade realizada na sua conta. Avise-nos com prontidão se suspeitar de utilização não autorizada.',
        ],
      },
      {
        heading: '3. Utilização aceitável',
        paragraphs: [
          'Utilize o SeamFlow apenas para fins lícitos. Não faça uso indevido do serviço, não tente perturbá-lo nem submetê-lo a engenharia inversa, e não o utilize para guardar ou partilhar conteúdos ilícitos.',
          'É responsável pela informação de clientes e encomendas que introduz, e por respeitar a privacidade e os direitos das pessoas cujos dados regista.',
        ],
      },
      {
        heading: '4. Os seus conteúdos',
        paragraphs: [
          'Mantém a titularidade dos dados que introduz. Concede-nos os direitos limitados necessários para alojar, tratar e apresentar esses dados exclusivamente para lhe prestar o SeamFlow.',
        ],
      },
      {
        heading: '5. Disponibilidade',
        paragraphs: [
          'Procuramos manter o SeamFlow fiável, mas é disponibilizado «conforme disponível». Podemos alterar, suspender ou descontinuar partes do serviço, sobretudo durante o acesso antecipado.',
        ],
      },
      {
        heading: '6. Exclusão de garantias',
        paragraphs: [
          'Na máxima medida permitida por lei, o SeamFlow é fornecido «tal como está» e «conforme disponível», sem garantias de qualquer tipo, expressas ou implícitas.',
        ],
      },
      {
        heading: '7. Limitação de responsabilidade',
        paragraphs: [
          'Na máxima medida permitida por lei, não somos responsáveis por quaisquer danos indiretos, incidentais, especiais ou consequenciais, nem pela perda de dados ou lucros, decorrentes da sua utilização do serviço. A nossa responsabilidade total está limitada ao montante que nos pagou nos doze meses anteriores à reclamação (que pode ser zero durante o acesso antecipado gratuito).',
        ],
      },
      {
        heading: '8. Cessação',
        paragraphs: [
          'Pode deixar de utilizar o SeamFlow a qualquer momento. Podemos suspender ou cessar o acesso caso estes Termos sejam violados ou para proteger o serviço e os seus utilizadores.',
        ],
      },
      {
        heading: '9. Lei aplicável',
        paragraphs: [
          'Estes Termos regem-se pelas leis da jurisdição em que o SeamFlow é operado. (A finalizar antes do lançamento.)',
        ],
      },
      {
        heading: '10. Alterações e contacto',
        paragraphs: [
          'Podemos atualizar estes Termos; a utilização continuada após uma atualização significa que aceita a alteração. Dúvidas? Escreva para contactseamflow@gmail.com.',
        ],
      },
    ],
  },
};
