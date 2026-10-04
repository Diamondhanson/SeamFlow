// ============================================================================
// Legal page content (Privacy Policy + Terms), one block per language. Kept out of components
// so wording is easy to edit. Rendered by app/privacy and app/terms.
//
// These are PUBLISHED, not drafts: Google Play's Data safety form points at
// /privacy, so this is the document a reviewer reads and a user is bound by.
// It has not been through a lawyer. Treat edits accordingly, and bump
// LEGAL_UPDATED whenever the substance changes — the date is shown on the page.
//
// WHAT THIS DOCUMENT HAS TO KEEP UP WITH
//
// SeamFlow stopped being a single-sided tool. Customers hold their own
// accounts, shops publish to a public Discover, subscriptions are sold, an
// assistant reads a tailor's own records to answer questions, and verification
// touches a phone number, a camera and (optionally) one location fix. Every one
// of those is a disclosure. When a feature starts collecting something, or
// starts showing something to someone new, it is not shipped until it is
// described here — and the Play Data safety form is updated to match, because
// Google checks one against the other.
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
export const LEGAL_UPDATED = '2026-10-04';

export const privacy: Record<Lang, LegalDoc> = {
  en: {
    intro:
      'This Privacy Policy explains what SeamFlow ("we", "us") collects, how we use it, and the choices you have. SeamFlow has two sides: a tool tailors and fashion designers use to run their business, and a place where customers can find them, ask for work and follow an order. This policy covers both.',
    sections: [
      {
        heading: '1. Who this applies to',
        paragraphs: [
          'There are two kinds of account. A shop account belongs to a tailor or designer, who uses SeamFlow to manage clients, measurements, orders, invoices and fabrics, and to publish their work so customers can find it.',
          'A customer account belongs to someone looking for a tailor. They can browse published work, send an enquiry, chat, share their own measurements, post a request and follow an order.',
          'Parts of SeamFlow can be read with no account at all: a shop’s public page, and the published designs in Discover.',
          'Where this policy says “you”, it means whichever of those describes you. Where the two are treated differently, we say so.',
        ],
      },
      {
        heading: '2. Information we collect',
        paragraphs: [
          'Account information: the email address and/or phone number you sign up with, and your language, currency and country preferences. For a shop account, also your business name, your city, and anything else you choose to put on your public page.',
          'Work you record (shop accounts): your clients’ names, phone numbers, addresses and measurements; order details, notes, prices and dates; group orders and their members; fabrics; invoices; and the photos you upload.',
          'What you send as a customer: the enquiries and messages you send a shop, the measurements you choose to share with one, the requests you post, and the orders a shop has created for you.',
          'Messages and support: the contents of conversations between a shop and a customer, and of any support ticket you open, including photos attached to either.',
          'Payment information: when you buy a subscription we record the plan, the amount, the currency, the method and whether it succeeded. Mobile-money payments need the phone number you are paying from. We never see or store full card numbers — those go straight to our payment provider.',
          'Device permissions you grant: the camera and photo library (to add photos), contacts (only the one contact you pick, to save a client), the microphone and speech recognition (only while you hold the voice button in the assistant), and location (see section 7). Each is asked for at the moment it is needed, and SeamFlow works without any of them — that one feature is simply unavailable.',
          'Device & usage data: a push-notification token so we can send reminders, basic device and app information, and standard logs used to keep the service running and to diagnose problems.',
        ],
      },
      {
        heading: '3. What other people can see',
        paragraphs: [
          'Most of what you record is private. Your client book, your orders, your measurements, your invoices and your conversations are visible only to you — and, for a conversation, to the person on the other side of it.',
          'Some things about a shop are public: readable by anyone, with or without a SeamFlow account, and possibly indexed by search engines. Those are your business name and city, the designs you publish, your verified mark if you have one, the social handle you link if you choose to, and a few signals about how you work, such as how quickly you typically reply and how many orders you have completed.',
          'Publishing is a choice. A design becomes public only when you publish it, and you can unpublish it at any time.',
          'Think about the people in your photographs. If an image shows a client or a model, make sure they are content for it to appear publicly before you publish it.',
        ],
      },
      {
        heading: '4. How we use your information',
        paragraphs: [
          'To provide the core service: storing and syncing your work across your devices, delivering messages, and letting customers find shops and follow their orders.',
          'To send the notifications and reminders you have enabled (for example, upcoming fittings and delivery dates), and the emails about your plan that you have agreed to receive.',
          'To take payment for a subscription and keep a record of it.',
          'To provide support, keep the service secure, prevent abuse, and improve how SeamFlow works.',
          'We do not sell your personal information, and we do not use the content you enter to advertise to you.',
        ],
      },
      {
        heading: '5. Artificial intelligence',
        paragraphs: [
          'Several optional features send data to Anthropic, which runs the model that answers. None of them run unless you ask for them.',
          'Describing a photo, reading measurements from a photo, filing a design and tidying up notes each send the one image or the one piece of text you chose, and nothing else.',
          'The assistant is broader. To answer a question it may look up your own clients, orders, measurements, invoices, fabrics and group orders, and what it looks up is sent with your question. It can also propose a change — creating an order, say — but nothing is saved until you confirm it on screen.',
          'Anthropic processes this in order to produce the answer and does not use it to train their models.',
          'If you would rather no business data reached a model, do not use the assistant. Everything else in SeamFlow works without it.',
        ],
      },
      {
        heading: '6. Payments and subscriptions',
        paragraphs: [
          'Subscriptions are sold through our payment provider, Fapshi, which handles mobile money and cards. To take a payment we pass them the amount, the currency, a reference and — for mobile money — the phone number you are paying from.',
          'We receive back whether the payment succeeded and a transaction reference, and we keep both as the record of what you paid. We do not receive or store full card numbers.',
        ],
      },
      {
        heading: '7. Verification',
        paragraphs: [
          'Verification is optional. Skipping it changes nothing about what you can do in SeamFlow.',
          'Confirming your phone number sends that number to Didit, who deliver a one-time code over WhatsApp or SMS and tell us whether the code you typed was correct. We keep the number and the fact that it was confirmed.',
          'The work photo you take is seen only by SeamFlow staff reviewing your request. It never appears on your shop or in Discover, and we delete it 90 days after we decide.',
          'If you link a social account, the handle you give becomes public on your shop once a member of our team has confirmed the account is yours.',
          'If you confirm your area, the app takes one location reading at the moment you tap the button, and never again. There is no background tracking and nothing keeps running afterwards. We round the reading before it leaves your device, store it with your verification request, and show customers only the neighbourhood — never a point on a map.',
          'A business registration number, if you give one, is seen only by staff and is never published.',
        ],
      },
      {
        heading: '8. Service providers',
        paragraphs: [
          'We rely on a small number of providers to run SeamFlow. Each processes data on our behalf, under their own security and privacy commitments.',
          'Supabase: database, authentication and file storage. Render: the servers the apps talk to. Vercel: hosting for our website and the browser version of the app. Upstash: background job queues.',
          'Expo: delivery of push notifications. Resend: delivery of email. Didit: phone-number verification. Fapshi: payments. Anthropic: the AI features described in section 5. Sentry: error reports that help us find and fix crashes.',
        ],
      },
      {
        heading: '9. Data about the people you record',
        paragraphs: [
          'If you run a shop, the client details you type in are yours. You decide what to record and why; we store and process it on your behalf, solely to provide SeamFlow to you. You are responsible for having a proper basis to collect those details and for how you use them.',
          'A customer who holds their own SeamFlow account is different. Their account, their messages and the measurements they choose to share are their relationship with us, not something you hold on their behalf — so they exercise their rights with us directly, and we answer to them for it.',
        ],
      },
      {
        heading: '10. Storage, location and retention',
        paragraphs: [
          'Your data is stored on our providers’ cloud infrastructure. It may be processed in countries other than your own; where that happens we rely on appropriate safeguards.',
          'Messages and support requests are kept on our servers as a record, so a lost or replaced phone never loses a conversation. Your phone also keeps a copy of recent chats so they open quickly and can be read offline; that copy is erased when you sign out. Full-size photos shared in a chat are removed 90 days after the order they relate to is delivered. A smaller preview is kept, so the conversation still makes sense, and nothing is removed while that order has an open support request.',
          'Verification photos are deleted 90 days after we decide on the request. A request you withdraw is cleared on the same timetable, counted from when you sent it.',
          'We keep your data while your account is active. When you ask us to delete your account, your public page stops being visible immediately and everything is erased 30 days later. The delay exists so you can change your mind: sign in at any point during those 30 days and choose “Keep my account” to cancel. After that it is permanent and we cannot recover it for you.',
          'Two things outlast a deletion, and neither identifies you. Messages you sent stay in the other person’s conversation with your name and their contents removed, so their side of the thread still makes sense. And we keep records that identify nobody where they are needed to keep the service working for other people.',
        ],
      },
      {
        heading: '11. Your rights and choices',
        paragraphs: [
          'You can access, correct, export or delete your data. To delete your account, open the app and go to Settings → Account → Delete my account, which also offers you a copy of everything to download first. If you no longer have the app installed, seamflowtech.com/delete-account explains how to ask us instead. For anything else, email us and we will help.',
          'You can also turn notifications and plan emails off in Settings, unpublish any design, withdraw a verification request while it is still with us, and ask us to remove a verified mark.',
          'Depending on where you live, you may have additional rights under local law (such as the right to object to or restrict certain processing).',
        ],
      },
      {
        heading: '12. Security',
        paragraphs: [
          'We protect your data with encryption in transit, access controls, and an optional on-device PIN lock. Staff access to the tools that can read account data requires a second factor at sign-in.',
          'No method of transmission or storage is ever 100% secure, but we work to protect your information and to respond quickly to any issue.',
        ],
      },
      {
        heading: '13. Children',
        paragraphs: [
          'SeamFlow is not directed to children. You must be at least 16 to hold an account, and we do not knowingly collect personal information from anyone younger.',
        ],
      },
      {
        heading: '14. Changes to this policy',
        paragraphs: [
          'We may update this policy as SeamFlow evolves. The "last updated" date at the top reflects the latest version, and we will make reasonable efforts to notify you of material changes.',
        ],
      },
      {
        heading: '15. Contact',
        paragraphs: [
          'Questions about privacy? Email us at contactseamflow@gmail.com and we’ll get back to you.',
        ],
      },
    ],
  },

  fr: {
    intro:
      'Cette Politique de confidentialité explique ce que SeamFlow (« nous ») collecte, comment nous l’utilisons et les choix dont vous disposez. SeamFlow a deux faces : un outil que les tailleurs et créateurs utilisent pour gérer leur activité, et un endroit où les clientes et clients peuvent les trouver, demander une pièce et suivre une commande. Cette politique couvre les deux.',
    sections: [
      {
        heading: '1. À qui cela s’applique',
        paragraphs: [
          'Il existe deux types de compte. Un compte atelier appartient à un tailleur ou créateur, qui utilise SeamFlow pour gérer clients, mesures, commandes, factures et tissus, et pour publier son travail afin qu’on le trouve.',
          'Un compte client appartient à une personne qui cherche un tailleur. Elle peut parcourir les travaux publiés, envoyer une demande, discuter, partager ses propres mesures, publier une annonce et suivre une commande.',
          'Certaines parties de SeamFlow se consultent sans aucun compte : la page publique d’un atelier et les créations publiées dans Découvrir.',
          'Lorsque cette politique dit « vous », cela désigne celui des deux qui vous correspond. Lorsque les deux sont traités différemment, nous le précisons.',
        ],
      },
      {
        heading: '2. Informations que nous collectons',
        paragraphs: [
          'Informations de compte : l’adresse e-mail et/ou le numéro de téléphone d’inscription, ainsi que vos préférences de langue, de devise et de pays. Pour un compte atelier, également le nom de votre atelier, votre ville et tout ce que vous choisissez de mettre sur votre page publique.',
          'Ce que vous enregistrez (comptes atelier) : les noms, numéros, adresses et mesures de vos clientes et clients ; les détails, notes, prix et dates des commandes ; les commandes de groupe et leurs membres ; les tissus ; les factures ; et les photos que vous téléversez.',
          'Ce que vous envoyez en tant que cliente ou client : les demandes et messages adressés à un atelier, les mesures que vous choisissez de partager, les annonces que vous publiez et les commandes qu’un atelier a créées pour vous.',
          'Messages et assistance : le contenu des conversations entre un atelier et une cliente ou un client, et celui de tout ticket d’assistance que vous ouvrez, y compris les photos qui y sont jointes.',
          'Informations de paiement : lorsque vous achetez un abonnement, nous enregistrons la formule, le montant, la devise, le moyen de paiement et le résultat. Les paiements par mobile money nécessitent le numéro depuis lequel vous payez. Nous ne voyons ni ne conservons jamais de numéro de carte complet : il va directement à notre prestataire de paiement.',
          'Autorisations que vous accordez : l’appareil photo et la galerie (pour ajouter des photos), les contacts (uniquement le contact que vous choisissez, pour enregistrer un client), le microphone et la reconnaissance vocale (uniquement pendant que vous maintenez le bouton vocal de l’assistant) et la localisation (voir la section 7). Chacune est demandée au moment où elle sert, et SeamFlow fonctionne sans aucune d’elles : seule la fonction concernée devient indisponible.',
          'Données d’appareil et d’usage : un jeton de notification pour vous envoyer des rappels, des informations de base sur l’appareil et l’application, et les journaux standards nécessaires au fonctionnement du service et au diagnostic des problèmes.',
        ],
      },
      {
        heading: '3. Ce que les autres peuvent voir',
        paragraphs: [
          'L’essentiel de ce que vous enregistrez reste privé. Votre carnet de clients, vos commandes, vos mesures, vos factures et vos conversations ne sont visibles que par vous — et, pour une conversation, par la personne en face.',
          'Certaines informations d’un atelier sont publiques : lisibles par n’importe qui, avec ou sans compte SeamFlow, et éventuellement indexées par les moteurs de recherche. Il s’agit du nom de votre atelier et de votre ville, des créations que vous publiez, de votre marque de vérification le cas échéant, du compte social que vous associez si vous le souhaitez, et de quelques indicateurs sur votre façon de travailler, comme votre délai de réponse habituel et le nombre de commandes terminées.',
          'Publier est un choix. Une création ne devient publique que lorsque vous la publiez, et vous pouvez la retirer à tout moment.',
          'Pensez aux personnes présentes sur vos photos. Si une image montre une cliente, un client ou un mannequin, assurez-vous qu’ils acceptent qu’elle paraisse publiquement avant de la publier.',
        ],
      },
      {
        heading: '4. Comment nous utilisons vos informations',
        paragraphs: [
          'Pour fournir le service : stocker et synchroniser votre travail entre vos appareils, acheminer les messages, et permettre aux clientes et clients de trouver des ateliers et de suivre leurs commandes.',
          'Pour envoyer les notifications et rappels que vous avez activés (par exemple les essayages et dates de livraison à venir) et les e-mails relatifs à votre formule que vous avez acceptés.',
          'Pour encaisser un abonnement et en conserver la trace.',
          'Pour assurer l’assistance, la sécurité du service, prévenir les abus et améliorer SeamFlow.',
          'Nous ne vendons pas vos informations personnelles et nous n’utilisons pas vos contenus pour vous adresser de la publicité.',
        ],
      },
      {
        heading: '5. Intelligence artificielle',
        paragraphs: [
          'Plusieurs fonctions facultatives envoient des données à Anthropic, qui fait tourner le modèle qui répond. Aucune ne s’exécute sans que vous le demandiez.',
          'Décrire une photo, lire des mesures sur une photo, classer une création et mettre des notes au propre envoient uniquement l’image ou le texte que vous avez choisi, et rien d’autre.',
          'L’assistant va plus loin. Pour répondre, il peut consulter vos propres clients, commandes, mesures, factures, tissus et commandes de groupe, et ce qu’il consulte est envoyé avec votre question. Il peut aussi proposer une action — créer une commande, par exemple — mais rien n’est enregistré tant que vous ne le confirmez pas à l’écran.',
          'Anthropic traite ces données pour produire la réponse et ne les utilise pas pour entraîner ses modèles.',
          'Si vous préférez qu’aucune donnée de votre activité ne parvienne à un modèle, n’utilisez pas l’assistant. Tout le reste de SeamFlow fonctionne sans lui.',
        ],
      },
      {
        heading: '6. Paiements et abonnements',
        paragraphs: [
          'Les abonnements sont vendus via notre prestataire de paiement, Fapshi, qui gère le mobile money et les cartes. Pour encaisser, nous lui transmettons le montant, la devise, une référence et — pour le mobile money — le numéro depuis lequel vous payez.',
          'Nous recevons en retour le résultat du paiement et une référence de transaction, que nous conservons comme preuve de ce que vous avez payé. Nous ne recevons ni ne conservons de numéro de carte complet.',
        ],
      },
      {
        heading: '7. Vérification',
        paragraphs: [
          'La vérification est facultative. Ne pas la faire ne change rien à ce que vous pouvez faire dans SeamFlow.',
          'Confirmer votre numéro de téléphone transmet ce numéro à Didit, qui envoie un code à usage unique par WhatsApp ou SMS et nous indique si le code saisi était correct. Nous conservons le numéro et le fait qu’il a été confirmé.',
          'La photo de travail que vous prenez n’est vue que par le personnel de SeamFlow qui examine votre demande. Elle n’apparaît jamais sur votre atelier ni dans Découvrir, et nous la supprimons 90 jours après notre décision.',
          'Si vous associez un compte social, le pseudonyme que vous indiquez devient public sur votre atelier une fois qu’un membre de notre équipe a confirmé que le compte est bien le vôtre.',
          'Si vous confirmez votre zone, l’application prend une seule mesure de position au moment où vous appuyez sur le bouton, et jamais ensuite. Il n’y a aucun suivi en arrière-plan et rien ne continue de tourner après. Nous arrondissons la mesure avant qu’elle quitte votre appareil, la stockons avec votre demande de vérification et ne montrons aux clientes et clients que le quartier — jamais un point sur une carte.',
          'Un numéro d’enregistrement d’entreprise, si vous en fournissez un, n’est vu que par le personnel et n’est jamais publié.',
        ],
      },
      {
        heading: '8. Prestataires',
        paragraphs: [
          'Nous nous appuyons sur un petit nombre de prestataires pour faire fonctionner SeamFlow. Chacun traite les données pour notre compte, selon ses propres engagements de sécurité et de confidentialité.',
          'Supabase : base de données, authentification et stockage de fichiers. Render : les serveurs auxquels les applications s’adressent. Vercel : hébergement de notre site et de la version navigateur de l’application. Upstash : files de tâches en arrière-plan.',
          'Expo : envoi des notifications push. Resend : envoi des e-mails. Didit : vérification des numéros de téléphone. Fapshi : paiements. Anthropic : les fonctions d’IA décrites à la section 5. Sentry : rapports d’erreur qui nous aident à repérer et corriger les plantages.',
        ],
      },
      {
        heading: '9. Les données des personnes que vous enregistrez',
        paragraphs: [
          'Si vous tenez un atelier, les informations clients que vous saisissez sont les vôtres. Vous décidez de ce que vous enregistrez et pourquoi ; nous les stockons et les traitons pour votre compte, uniquement pour vous fournir SeamFlow. Il vous appartient d’avoir une base légitime pour collecter ces informations et de répondre de leur usage.',
          'Une cliente ou un client disposant de son propre compte SeamFlow, c’est différent. Son compte, ses messages et les mesures qu’elle ou il choisit de partager relèvent de sa relation avec nous, et non de quelque chose que vous détiendriez pour elle ou lui : ces personnes exercent donc leurs droits directement auprès de nous, et nous en répondons devant elles.',
        ],
      },
      {
        heading: '10. Stockage, localisation et conservation',
        paragraphs: [
          'Vos données sont stockées sur l’infrastructure cloud de nos prestataires. Elles peuvent être traitées dans des pays autres que le vôtre ; dans ce cas nous nous appuyons sur des garanties appropriées.',
          'Les messages et demandes d’assistance sont conservés sur nos serveurs, pour qu’un téléphone perdu ou remplacé ne fasse jamais perdre une conversation. Votre téléphone garde aussi une copie des discussions récentes afin qu’elles s’ouvrent vite et se lisent hors ligne ; cette copie est effacée à la déconnexion. Les photos en pleine taille partagées dans une discussion sont supprimées 90 jours après la livraison de la commande concernée. Un aperçu plus petit est conservé pour que la conversation reste compréhensible, et rien n’est supprimé tant qu’une demande d’assistance est ouverte sur cette commande.',
          'Les photos de vérification sont supprimées 90 jours après notre décision. Une demande que vous retirez est effacée selon le même calendrier, compté depuis son envoi.',
          'Nous conservons vos données tant que votre compte est actif. Lorsque vous demandez la suppression de votre compte, votre page publique cesse immédiatement d’être visible et tout est effacé 30 jours plus tard. Ce délai existe pour vous laisser changer d’avis : connectez-vous à tout moment pendant ces 30 jours et choisissez « Garder mon compte » pour annuler. Ensuite, c’est définitif et nous ne pouvons rien récupérer.',
          'Deux choses survivent à une suppression, et aucune ne vous identifie. Les messages que vous avez envoyés restent dans la conversation de l’autre personne, votre nom et leur contenu retirés, pour que son côté du fil garde un sens. Et nous conservons des enregistrements qui n’identifient personne là où ils sont nécessaires au bon fonctionnement du service pour les autres.',
        ],
      },
      {
        heading: '11. Vos droits et vos choix',
        paragraphs: [
          'Vous pouvez accéder à vos données, les corriger, les exporter ou les supprimer. Pour supprimer votre compte, ouvrez l’application et allez dans Réglages → Compte → Supprimer mon compte, ce qui vous propose aussi d’en télécharger une copie complète au préalable. Si vous n’avez plus l’application, seamflowtech.com/delete-account explique comment nous le demander. Pour tout le reste, écrivez-nous et nous vous aiderons.',
          'Vous pouvez aussi désactiver les notifications et les e-mails liés à votre formule dans les Réglages, retirer une création publiée, retirer une demande de vérification tant qu’elle est entre nos mains, et nous demander de retirer une marque de vérification.',
          'Selon votre lieu de résidence, vous pouvez disposer de droits supplémentaires au titre du droit local (comme le droit de vous opposer à certains traitements ou de les limiter).',
        ],
      },
      {
        heading: '12. Sécurité',
        paragraphs: [
          'Nous protégeons vos données par le chiffrement en transit, des contrôles d’accès et un verrouillage par code PIN facultatif sur l’appareil. L’accès du personnel aux outils capables de lire des données de compte exige un second facteur à la connexion.',
          'Aucune méthode de transmission ou de stockage n’est sûre à 100 %, mais nous travaillons à protéger vos informations et à réagir vite en cas de problème.',
        ],
      },
      {
        heading: '13. Enfants',
        paragraphs: [
          'SeamFlow ne s’adresse pas aux enfants. Vous devez avoir au moins 16 ans pour détenir un compte, et nous ne collectons pas sciemment d’informations personnelles de personnes plus jeunes.',
        ],
      },
      {
        heading: '14. Modifications de cette politique',
        paragraphs: [
          'Nous pouvons mettre à jour cette politique à mesure que SeamFlow évolue. La date de « dernière mise à jour » en haut de page correspond à la version la plus récente, et nous ferons des efforts raisonnables pour vous informer des changements importants.',
        ],
      },
      {
        heading: '15. Contact',
        paragraphs: [
          'Des questions sur la confidentialité ? Écrivez-nous à contactseamflow@gmail.com et nous vous répondrons.',
        ],
      },
    ],
  },

  pt: {
    intro:
      'Esta Política de Privacidade explica o que o SeamFlow («nós») recolhe, como o utilizamos e que escolhas tem. O SeamFlow tem dois lados: uma ferramenta que alfaiates e criadores de moda usam para gerir o seu negócio, e um lugar onde os clientes os encontram, pedem uma peça e acompanham uma encomenda. Esta política cobre ambos.',
    sections: [
      {
        heading: '1. A quem se aplica',
        paragraphs: [
          'Há dois tipos de conta. Uma conta de oficina pertence a um alfaiate ou criador, que usa o SeamFlow para gerir clientes, medidas, encomendas, faturas e tecidos, e para publicar o seu trabalho para que o encontrem.',
          'Uma conta de cliente pertence a quem procura um alfaiate. Pode ver trabalhos publicados, enviar um pedido, conversar, partilhar as suas próprias medidas, publicar um anúncio e acompanhar uma encomenda.',
          'Partes do SeamFlow podem ser lidas sem conta nenhuma: a página pública de uma oficina e as criações publicadas em Descobrir.',
          'Quando esta política diz «você», refere-se àquele dos dois que o descreve. Onde os dois são tratados de forma diferente, dizemo-lo.',
        ],
      },
      {
        heading: '2. Informações que recolhemos',
        paragraphs: [
          'Informações da conta: o endereço de e-mail e/ou número de telefone com que se inscreve, e as suas preferências de idioma, moeda e país. Numa conta de oficina, também o nome da oficina, a cidade e tudo o que escolher colocar na sua página pública.',
          'O que regista (contas de oficina): nomes, telefones, moradas e medidas dos seus clientes; detalhes, notas, preços e datas das encomendas; encomendas de grupo e os seus membros; tecidos; faturas; e as fotografias que carrega.',
          'O que envia como cliente: os pedidos e mensagens que envia a uma oficina, as medidas que escolhe partilhar, os anúncios que publica e as encomendas que uma oficina criou para si.',
          'Mensagens e apoio: o conteúdo das conversas entre uma oficina e um cliente, e de qualquer pedido de apoio que abra, incluindo fotografias anexadas.',
          'Informações de pagamento: ao comprar uma subscrição registamos o plano, o valor, a moeda, o método e se foi bem-sucedido. Os pagamentos por mobile money exigem o número de onde está a pagar. Nunca vemos nem guardamos números de cartão completos — esses vão diretamente para o nosso fornecedor de pagamentos.',
          'Permissões que concede: a câmara e a galeria (para adicionar fotografias), os contactos (apenas o contacto que escolhe, para guardar um cliente), o microfone e o reconhecimento de voz (apenas enquanto mantém o botão de voz do assistente) e a localização (ver secção 7). Cada uma é pedida no momento em que é necessária, e o SeamFlow funciona sem nenhuma delas — apenas essa função fica indisponível.',
          'Dados de dispositivo e utilização: um token de notificação para lhe enviarmos lembretes, informação básica do dispositivo e da aplicação, e os registos normais usados para manter o serviço a funcionar e diagnosticar problemas.',
        ],
      },
      {
        heading: '3. O que os outros podem ver',
        paragraphs: [
          'A maior parte do que regista é privada. O seu livro de clientes, as suas encomendas, as suas medidas, as suas faturas e as suas conversas só são visíveis para si — e, numa conversa, para a pessoa do outro lado.',
          'Algumas informações de uma oficina são públicas: legíveis por qualquer pessoa, com ou sem conta SeamFlow, e possivelmente indexadas pelos motores de busca. São o nome da oficina e a cidade, as criações que publica, a sua marca de verificação se a tiver, o perfil social que associar se quiser, e alguns sinais sobre a sua forma de trabalhar, como a rapidez habitual de resposta e o número de encomendas concluídas.',
          'Publicar é uma escolha. Uma criação só se torna pública quando a publica, e pode retirá-la a qualquer momento.',
          'Pense nas pessoas das suas fotografias. Se uma imagem mostra um cliente ou um modelo, confirme que aceitam que apareça publicamente antes de a publicar.',
        ],
      },
      {
        heading: '4. Como usamos as suas informações',
        paragraphs: [
          'Para prestar o serviço: guardar e sincronizar o seu trabalho entre dispositivos, entregar mensagens e permitir que os clientes encontrem oficinas e acompanhem as suas encomendas.',
          'Para enviar as notificações e lembretes que ativou (por exemplo, provas e datas de entrega próximas) e os e-mails sobre o seu plano que aceitou receber.',
          'Para cobrar uma subscrição e manter o respetivo registo.',
          'Para dar apoio, manter o serviço seguro, prevenir abusos e melhorar o SeamFlow.',
          'Não vendemos as suas informações pessoais e não usamos o que escreve para lhe mostrar publicidade.',
        ],
      },
      {
        heading: '5. Inteligência artificial',
        paragraphs: [
          'Várias funções opcionais enviam dados à Anthropic, que executa o modelo que responde. Nenhuma funciona sem que a peça.',
          'Descrever uma fotografia, ler medidas numa fotografia, classificar uma criação e arrumar notas enviam apenas a imagem ou o texto que escolheu, e mais nada.',
          'O assistente vai mais longe. Para responder pode consultar os seus próprios clientes, encomendas, medidas, faturas, tecidos e encomendas de grupo, e o que consulta segue com a sua pergunta. Também pode propor uma alteração — criar uma encomenda, por exemplo — mas nada é guardado até confirmar no ecrã.',
          'A Anthropic processa isto para produzir a resposta e não o utiliza para treinar os seus modelos.',
          'Se preferir que nenhum dado do seu negócio chegue a um modelo, não use o assistente. Todo o resto do SeamFlow funciona sem ele.',
        ],
      },
      {
        heading: '6. Pagamentos e subscrições',
        paragraphs: [
          'As subscrições são vendidas através do nosso fornecedor de pagamentos, Fapshi, que trata de mobile money e cartões. Para cobrar, enviamos-lhe o valor, a moeda, uma referência e — no mobile money — o número de onde está a pagar.',
          'Recebemos de volta se o pagamento foi bem-sucedido e uma referência da transação, e guardamos ambos como registo do que pagou. Não recebemos nem guardamos números de cartão completos.',
        ],
      },
      {
        heading: '7. Verificação',
        paragraphs: [
          'A verificação é opcional. Não a fazer não altera nada do que pode fazer no SeamFlow.',
          'Confirmar o seu número envia esse número à Didit, que entrega um código de utilização única por WhatsApp ou SMS e nos diz se o código que escreveu estava correto. Guardamos o número e o facto de ter sido confirmado.',
          'A fotografia de trabalho que tira é vista apenas pela equipa do SeamFlow que analisa o seu pedido. Nunca aparece na sua oficina nem em Descobrir, e apagamo-la 90 dias depois de decidirmos.',
          'Se associar uma conta social, o nome de utilizador que indicar torna-se público na sua oficina assim que alguém da nossa equipa confirmar que a conta é sua.',
          'Se confirmar a sua zona, a aplicação faz uma única leitura de localização no momento em que toca no botão, e nunca mais. Não há seguimento em segundo plano e nada continua a correr depois. Arredondamos a leitura antes de sair do seu dispositivo, guardamo-la com o pedido de verificação e mostramos aos clientes apenas o bairro — nunca um ponto no mapa.',
          'Um número de registo comercial, se o indicar, é visto apenas pela equipa e nunca é publicado.',
        ],
      },
      {
        heading: '8. Fornecedores de serviços',
        paragraphs: [
          'Contamos com um pequeno número de fornecedores para fazer funcionar o SeamFlow. Cada um trata dados por nossa conta, segundo os seus próprios compromissos de segurança e privacidade.',
          'Supabase: base de dados, autenticação e armazenamento de ficheiros. Render: os servidores com que as aplicações falam. Vercel: alojamento do nosso site e da versão de navegador da aplicação. Upstash: filas de tarefas em segundo plano.',
          'Expo: entrega de notificações push. Resend: envio de e-mail. Didit: verificação de números de telefone. Fapshi: pagamentos. Anthropic: as funções de IA descritas na secção 5. Sentry: relatórios de erro que nos ajudam a encontrar e corrigir falhas.',
        ],
      },
      {
        heading: '9. Dados sobre as pessoas que regista',
        paragraphs: [
          'Se tem uma oficina, os dados de cliente que escreve são seus. Decide o que regista e porquê; guardamos e tratamos esses dados por sua conta, apenas para lhe prestar o SeamFlow. É da sua responsabilidade ter uma base adequada para recolher esses dados e responder pelo uso que lhes dá.',
          'Um cliente com conta SeamFlow própria é diferente. A conta, as mensagens e as medidas que escolhe partilhar são a relação dessa pessoa connosco, e não algo que você detenha por ela — por isso exerce os seus direitos diretamente connosco, e respondemos perante ela.',
        ],
      },
      {
        heading: '10. Armazenamento, localização e conservação',
        paragraphs: [
          'Os seus dados são guardados na infraestrutura cloud dos nossos fornecedores. Podem ser tratados em países diferentes do seu; quando isso acontece, apoiamo-nos em salvaguardas adequadas.',
          'As mensagens e os pedidos de apoio ficam guardados nos nossos servidores, para que um telefone perdido ou substituído nunca faça perder uma conversa. O seu telefone guarda também uma cópia das conversas recentes para abrirem depressa e se lerem offline; essa cópia é apagada quando termina a sessão. As fotografias em tamanho completo partilhadas numa conversa são removidas 90 dias depois de entregue a encomenda a que dizem respeito. Fica uma pré-visualização mais pequena, para a conversa continuar a fazer sentido, e nada é removido enquanto essa encomenda tiver um pedido de apoio em aberto.',
          'As fotografias de verificação são apagadas 90 dias depois de decidirmos sobre o pedido. Um pedido que retire é limpo no mesmo prazo, contado a partir do envio.',
          'Guardamos os seus dados enquanto a conta estiver ativa. Quando pede para apagar a conta, a sua página pública deixa de estar visível de imediato e tudo é apagado 30 dias depois. O atraso existe para poder mudar de ideias: inicie sessão a qualquer momento nesses 30 dias e escolha «Manter a minha conta» para cancelar. Depois disso é permanente e não podemos recuperar nada.',
          'Duas coisas sobrevivem a uma eliminação, e nenhuma o identifica. As mensagens que enviou permanecem na conversa da outra pessoa, sem o seu nome e sem conteúdo, para que o lado dela continue a fazer sentido. E guardamos registos que não identificam ninguém quando são necessários para manter o serviço a funcionar para os outros.',
        ],
      },
      {
        heading: '11. Os seus direitos e escolhas',
        paragraphs: [
          'Pode aceder aos seus dados, corrigi-los, exportá-los ou apagá-los. Para apagar a conta, abra a aplicação e vá a Definições → Conta → Apagar a minha conta, que também lhe oferece uma cópia de tudo para descarregar antes. Se já não tiver a aplicação, seamflowtech.com/delete-account explica como no-lo pedir. Para o resto, escreva-nos e ajudamos.',
          'Pode também desligar notificações e e-mails do plano nas Definições, retirar uma criação publicada, retirar um pedido de verificação enquanto estiver connosco, e pedir-nos que retiremos uma marca de verificação.',
          'Consoante o local onde vive, pode ter direitos adicionais ao abrigo da lei local (como o direito de se opor a certos tratamentos ou de os limitar).',
        ],
      },
      {
        heading: '12. Segurança',
        paragraphs: [
          'Protegemos os seus dados com encriptação em trânsito, controlos de acesso e um bloqueio por PIN opcional no dispositivo. O acesso da equipa às ferramentas que leem dados de conta exige um segundo fator no início de sessão.',
          'Nenhum método de transmissão ou armazenamento é 100% seguro, mas trabalhamos para proteger as suas informações e responder depressa a qualquer problema.',
        ],
      },
      {
        heading: '13. Crianças',
        paragraphs: [
          'O SeamFlow não se dirige a crianças. Tem de ter pelo menos 16 anos para ter conta, e não recolhemos conscientemente informações pessoais de pessoas mais novas.',
        ],
      },
      {
        heading: '14. Alterações a esta política',
        paragraphs: [
          'Podemos atualizar esta política à medida que o SeamFlow evolui. A data de «última atualização» no topo reflete a versão mais recente, e faremos esforços razoáveis para o avisar de alterações importantes.',
        ],
      },
      {
        heading: '15. Contacto',
        paragraphs: [
          'Dúvidas sobre privacidade? Escreva para contactseamflow@gmail.com e respondemos.',
        ],
      },
    ],
  },

  es: {
    intro:
      'Esta Política de Privacidad explica qué recopila SeamFlow («nosotros»), cómo lo usamos y qué opciones tiene usted. SeamFlow tiene dos caras: una herramienta que sastres y diseñadores de moda usan para llevar su negocio, y un lugar donde los clientes pueden encontrarlos, pedir una prenda y seguir un pedido. Esta política cubre ambas.',
    sections: [
      {
        heading: '1. A quién se aplica',
        paragraphs: [
          'Hay dos tipos de cuenta. Una cuenta de taller pertenece a un sastre o diseñador, que usa SeamFlow para gestionar clientes, medidas, pedidos, facturas y telas, y para publicar su trabajo y que lo encuentren.',
          'Una cuenta de cliente pertenece a quien busca un sastre. Puede ver trabajos publicados, enviar una consulta, conversar, compartir sus propias medidas, publicar una solicitud y seguir un pedido.',
          'Hay partes de SeamFlow que se leen sin ninguna cuenta: la página pública de un taller y los diseños publicados en Descubrir.',
          'Cuando esta política dice «usted», se refiere al que le corresponda de los dos. Donde se tratan de forma distinta, lo decimos.',
        ],
      },
      {
        heading: '2. Información que recopilamos',
        paragraphs: [
          'Información de la cuenta: el correo electrónico y/o el número de teléfono con el que se registra, y sus preferencias de idioma, moneda y país. En una cuenta de taller, también el nombre del taller, su ciudad y todo lo que decida poner en su página pública.',
          'Lo que registra (cuentas de taller): nombres, teléfonos, direcciones y medidas de sus clientes; detalles, notas, precios y fechas de los pedidos; pedidos de grupo y sus integrantes; telas; facturas; y las fotos que sube.',
          'Lo que envía como cliente: las consultas y mensajes que envía a un taller, las medidas que decide compartir, las solicitudes que publica y los pedidos que un taller ha creado para usted.',
          'Mensajes y soporte: el contenido de las conversaciones entre un taller y un cliente, y de cualquier ticket de soporte que abra, incluidas las fotos adjuntas.',
          'Información de pago: al comprar una suscripción registramos el plan, el importe, la moneda, el método y si se completó. Los pagos por dinero móvil necesitan el número desde el que paga. Nunca vemos ni guardamos números de tarjeta completos: van directamente a nuestro proveedor de pagos.',
          'Permisos que concede: la cámara y la galería (para añadir fotos), los contactos (solo el contacto que elige, para guardar un cliente), el micrófono y el reconocimiento de voz (solo mientras mantiene pulsado el botón de voz del asistente) y la ubicación (véase la sección 7). Cada uno se pide en el momento en que hace falta, y SeamFlow funciona sin ninguno: solo esa función queda no disponible.',
          'Datos de dispositivo y uso: un token de notificaciones para enviarle recordatorios, información básica del dispositivo y la aplicación, y los registros habituales que mantienen el servicio en marcha y ayudan a diagnosticar problemas.',
        ],
      },
      {
        heading: '3. Qué pueden ver los demás',
        paragraphs: [
          'Casi todo lo que registra es privado. Su libreta de clientes, sus pedidos, sus medidas, sus facturas y sus conversaciones solo los ve usted — y, en una conversación, la persona del otro lado.',
          'Algunas cosas de un taller son públicas: las puede leer cualquiera, con o sin cuenta de SeamFlow, y pueden quedar indexadas por buscadores. Son el nombre del taller y su ciudad, los diseños que publica, su marca de verificación si la tiene, el perfil social que vincule si así lo decide, y unas pocas señales sobre cómo trabaja, como su rapidez habitual de respuesta y cuántos pedidos ha completado.',
          'Publicar es una decisión. Un diseño solo se hace público cuando usted lo publica, y puede retirarlo cuando quiera.',
          'Piense en las personas que salen en sus fotos. Si una imagen muestra a un cliente o a un modelo, asegúrese de que aceptan que aparezca públicamente antes de publicarla.',
        ],
      },
      {
        heading: '4. Cómo usamos su información',
        paragraphs: [
          'Para prestar el servicio: guardar y sincronizar su trabajo entre dispositivos, entregar mensajes y permitir que los clientes encuentren talleres y sigan sus pedidos.',
          'Para enviar las notificaciones y recordatorios que haya activado (por ejemplo, pruebas y fechas de entrega próximas) y los correos sobre su plan que haya aceptado recibir.',
          'Para cobrar una suscripción y conservar su registro.',
          'Para dar soporte, mantener el servicio seguro, prevenir abusos y mejorar SeamFlow.',
          'No vendemos su información personal y no usamos lo que escribe para mostrarle publicidad.',
        ],
      },
      {
        heading: '5. Inteligencia artificial',
        paragraphs: [
          'Varias funciones opcionales envían datos a Anthropic, que ejecuta el modelo que responde. Ninguna se activa si usted no la pide.',
          'Describir una foto, leer medidas de una foto, clasificar un diseño y ordenar notas envían solo la imagen o el texto que ha elegido, y nada más.',
          'El asistente va más allá. Para responder puede consultar sus propios clientes, pedidos, medidas, facturas, telas y pedidos de grupo, y lo que consulta se envía junto con su pregunta. También puede proponer un cambio —crear un pedido, por ejemplo— pero no se guarda nada hasta que usted lo confirma en pantalla.',
          'Anthropic procesa esto para producir la respuesta y no lo usa para entrenar sus modelos.',
          'Si prefiere que ningún dato de su negocio llegue a un modelo, no use el asistente. Todo lo demás en SeamFlow funciona sin él.',
        ],
      },
      {
        heading: '6. Pagos y suscripciones',
        paragraphs: [
          'Las suscripciones se venden a través de nuestro proveedor de pagos, Fapshi, que gestiona el dinero móvil y las tarjetas. Para cobrar le enviamos el importe, la moneda, una referencia y —en dinero móvil— el número desde el que paga.',
          'Recibimos de vuelta si el pago se completó y una referencia de la transacción, y guardamos ambos como constancia de lo que pagó. No recibimos ni guardamos números de tarjeta completos.',
        ],
      },
      {
        heading: '7. Verificación',
        paragraphs: [
          'La verificación es opcional. No hacerla no cambia nada de lo que puede hacer en SeamFlow.',
          'Confirmar su número envía ese número a Didit, que entrega un código de un solo uso por WhatsApp o SMS y nos dice si el código que escribió era correcto. Guardamos el número y el hecho de que se confirmó.',
          'La foto de trabajo que toma solo la ve el personal de SeamFlow que revisa su solicitud. Nunca aparece en su taller ni en Descubrir, y la borramos 90 días después de decidir.',
          'Si vincula una cuenta social, el usuario que indique se hace público en su taller en cuanto alguien de nuestro equipo confirma que la cuenta es suya.',
          'Si confirma su zona, la aplicación toma una sola lectura de ubicación en el momento en que pulsa el botón, y nunca más. No hay seguimiento en segundo plano y nada sigue funcionando después. Redondeamos la lectura antes de que salga de su dispositivo, la guardamos con su solicitud de verificación y mostramos a los clientes solo el barrio, nunca un punto en un mapa.',
          'Un número de registro mercantil, si lo facilita, solo lo ve el personal y nunca se publica.',
        ],
      },
      {
        heading: '8. Proveedores de servicios',
        paragraphs: [
          'Nos apoyamos en un número reducido de proveedores para que SeamFlow funcione. Cada uno trata los datos por cuenta nuestra, con sus propios compromisos de seguridad y privacidad.',
          'Supabase: base de datos, autenticación y almacenamiento de archivos. Render: los servidores con los que hablan las aplicaciones. Vercel: alojamiento de nuestra web y de la versión de navegador de la aplicación. Upstash: colas de tareas en segundo plano.',
          'Expo: entrega de notificaciones push. Resend: envío de correo. Didit: verificación de números de teléfono. Fapshi: pagos. Anthropic: las funciones de IA descritas en la sección 5. Sentry: informes de error que nos ayudan a encontrar y corregir fallos.',
        ],
      },
      {
        heading: '9. Datos sobre las personas que registra',
        paragraphs: [
          'Si lleva un taller, los datos de cliente que escribe son suyos. Usted decide qué registra y por qué; nosotros los guardamos y tratamos por cuenta suya, únicamente para prestarle SeamFlow. Le corresponde tener una base adecuada para recoger esos datos y responder del uso que les da.',
          'Un cliente con su propia cuenta de SeamFlow es distinto. Su cuenta, sus mensajes y las medidas que decide compartir son su relación con nosotros, no algo que usted tenga en su nombre: por eso ejerce sus derechos directamente ante nosotros, y nosotros respondemos ante él.',
        ],
      },
      {
        heading: '10. Almacenamiento, ubicación y conservación',
        paragraphs: [
          'Sus datos se guardan en la infraestructura en la nube de nuestros proveedores. Pueden tratarse en países distintos del suyo; cuando ocurre, nos apoyamos en salvaguardas adecuadas.',
          'Los mensajes y las solicitudes de soporte se conservan en nuestros servidores, para que un teléfono perdido o sustituido nunca pierda una conversación. Su teléfono guarda además una copia de los chats recientes para que se abran rápido y se lean sin conexión; esa copia se borra al cerrar sesión. Las fotos a tamaño completo compartidas en un chat se eliminan 90 días después de entregarse el pedido al que corresponden. Se conserva una vista previa más pequeña, para que la conversación siga teniendo sentido, y no se elimina nada mientras ese pedido tenga una solicitud de soporte abierta.',
          'Las fotos de verificación se borran 90 días después de que decidamos sobre la solicitud. Una solicitud que usted retire se limpia en el mismo plazo, contado desde que la envió.',
          'Conservamos sus datos mientras su cuenta esté activa. Cuando nos pide eliminar su cuenta, su página pública deja de verse de inmediato y todo se borra 30 días después. La demora existe para que pueda cambiar de idea: inicie sesión en cualquier momento de esos 30 días y elija «Mantener mi cuenta» para cancelar. Después es permanente y no podemos recuperarlo.',
          'Dos cosas sobreviven a una eliminación, y ninguna le identifica. Los mensajes que envió permanecen en la conversación de la otra persona, sin su nombre y sin su contenido, para que su lado del hilo siga teniendo sentido. Y conservamos registros que no identifican a nadie allí donde hacen falta para que el servicio siga funcionando para los demás.',
        ],
      },
      {
        heading: '11. Sus derechos y opciones',
        paragraphs: [
          'Puede acceder a sus datos, corregirlos, exportarlos o eliminarlos. Para eliminar su cuenta, abra la aplicación y vaya a Ajustes → Cuenta → Eliminar mi cuenta, que además le ofrece descargar antes una copia de todo. Si ya no tiene la aplicación, seamflowtech.com/delete-account explica cómo pedírnoslo. Para lo demás, escríbanos y le ayudamos.',
          'También puede desactivar las notificaciones y los correos del plan en Ajustes, retirar un diseño publicado, retirar una solicitud de verificación mientras esté en nuestras manos y pedirnos que retiremos una marca de verificación.',
          'Según dónde viva, puede tener derechos adicionales conforme a la ley local (como oponerse a ciertos tratamientos o limitarlos).',
        ],
      },
      {
        heading: '12. Seguridad',
        paragraphs: [
          'Protegemos sus datos con cifrado en tránsito, controles de acceso y un bloqueo por PIN opcional en el dispositivo. El acceso del personal a las herramientas que pueden leer datos de cuentas exige un segundo factor al iniciar sesión.',
          'Ningún método de transmisión o almacenamiento es 100 % seguro, pero trabajamos para proteger su información y responder rápido ante cualquier incidencia.',
        ],
      },
      {
        heading: '13. Menores',
        paragraphs: [
          'SeamFlow no se dirige a menores. Debe tener al menos 16 años para tener una cuenta, y no recopilamos conscientemente información personal de personas más jóvenes.',
        ],
      },
      {
        heading: '14. Cambios en esta política',
        paragraphs: [
          'Podemos actualizar esta política a medida que SeamFlow evoluciona. La fecha de «última actualización» en la parte superior refleja la versión más reciente, y haremos esfuerzos razonables por avisarle de los cambios importantes.',
        ],
      },
      {
        heading: '15. Contacto',
        paragraphs: [
          '¿Preguntas sobre privacidad? Escríbanos a contactseamflow@gmail.com y le responderemos.',
        ],
      },
    ],
  },

  sw: {
    intro:
      'Sera hii ya Faragha inaeleza SeamFlow (“sisi”) tunachokusanya, jinsi tunavyokitumia, na chaguo ulizo nazo. SeamFlow ina pande mbili: zana ambayo washonaji na wabunifu wa mavazi hutumia kuendesha biashara yao, na mahali ambapo wateja wanaweza kuwapata, kuomba kazi na kufuatilia agizo. Sera hii inahusu zote mbili.',
    sections: [
      {
        heading: '1. Inamhusu nani',
        paragraphs: [
          'Kuna aina mbili za akaunti. Akaunti ya duka ni ya mshonaji au mbunifu, anayetumia SeamFlow kusimamia wateja, vipimo, maagizo, ankara na vitambaa, na kuchapisha kazi yake ili ipatikane.',
          'Akaunti ya mteja ni ya mtu anayetafuta mshonaji. Anaweza kuona kazi zilizochapishwa, kutuma ombi, kupiga soga, kushiriki vipimo vyake mwenyewe, kuchapisha ombi na kufuatilia agizo.',
          'Baadhi ya sehemu za SeamFlow zinasomeka bila akaunti yoyote: ukurasa wa umma wa duka, na mitindo iliyochapishwa katika Gundua.',
          'Sera hii ikisema “wewe”, inamaanisha ile inayokuelezea kati ya hizo mbili. Pale zinapotofautiana, tunasema wazi.',
        ],
      },
      {
        heading: '2. Taarifa tunazokusanya',
        paragraphs: [
          'Taarifa za akaunti: barua pepe na/au namba ya simu unayojisajili nayo, na mapendeleo yako ya lugha, sarafu na nchi. Kwa akaunti ya duka, pia jina la duka lako, mji wako, na chochote unachochagua kuweka kwenye ukurasa wako wa umma.',
          'Unachorekodi (akaunti za duka): majina, namba za simu, anwani na vipimo vya wateja wako; maelezo ya maagizo, madokezo, bei na tarehe; maagizo ya kikundi na wanachama wake; vitambaa; ankara; na picha unazopakia.',
          'Unachotuma kama mteja: maombi na ujumbe unaotuma kwa duka, vipimo unavyochagua kushiriki, maombi unayochapisha, na maagizo ambayo duka limekuundia.',
          'Ujumbe na msaada: maudhui ya mazungumzo kati ya duka na mteja, na ya tiketi yoyote ya msaada unayofungua, pamoja na picha zilizoambatishwa.',
          'Taarifa za malipo: ununuapo usajili tunarekodi mpango, kiasi, sarafu, njia, na kama ulifanikiwa. Malipo ya pesa za simu yanahitaji namba unayolipia. Hatuoni wala hatuhifadhi namba kamili za kadi — hizo huenda moja kwa moja kwa mtoa huduma wetu wa malipo.',
          'Ruhusa unazotoa: kamera na maktaba ya picha (kuongeza picha), anwani (ni mwasiliani mmoja tu unayemchagua, kuhifadhi mteja), kipaza sauti na utambuzi wa usemi (ni wakati tu unaposhikilia kitufe cha sauti kwenye msaidizi), na mahali ulipo (angalia sehemu ya 7). Kila moja huombwa wakati inapohitajika, na SeamFlow inafanya kazi bila yoyote kati yake — ni kipengele hicho tu kinachokosekana.',
          'Data ya kifaa na matumizi: tokeni ya arifa ili tukutumie vikumbusho, taarifa za msingi za kifaa na programu, na kumbukumbu za kawaida zinazotumika kuendesha huduma na kutambua matatizo.',
        ],
      },
      {
        heading: '3. Wengine wanaweza kuona nini',
        paragraphs: [
          'Mengi ya unayorekodi ni ya faragha. Daftari lako la wateja, maagizo yako, vipimo vyako, ankara zako na mazungumzo yako vinaonekana kwako pekee — na, kwa mazungumzo, kwa mtu aliye upande wa pili.',
          'Baadhi ya mambo ya duka ni ya umma: yanaweza kusomwa na mtu yeyote, awe na akaunti ya SeamFlow au la, na yanaweza kuorodheshwa na injini za utafutaji. Haya ni jina la duka lako na mji wako, mitindo unayochapisha, alama yako ya uthibitisho ikiwa unayo, akaunti ya mtandao wa kijamii unayounganisha ukipenda, na viashiria vichache kuhusu jinsi unavyofanya kazi, kama kasi yako ya kawaida ya kujibu na idadi ya maagizo uliyokamilisha.',
          'Kuchapisha ni chaguo. Mtindo huwa wa umma pale tu unapouchapisha, na unaweza kuuondoa wakati wowote.',
          'Fikiria watu walioko kwenye picha zako. Picha ikionyesha mteja au mwanamitindo, hakikisha wanakubali ionekane hadharani kabla ya kuichapisha.',
        ],
      },
      {
        heading: '4. Jinsi tunavyotumia taarifa zako',
        paragraphs: [
          'Kutoa huduma yenyewe: kuhifadhi na kusawazisha kazi yako kwenye vifaa vyako, kufikisha ujumbe, na kuwawezesha wateja kupata maduka na kufuatilia maagizo yao.',
          'Kutuma arifa na vikumbusho ulivyowasha (kwa mfano, vipimo vijavyo na tarehe za kukabidhi), na barua pepe kuhusu mpango wako ulizokubali kupokea.',
          'Kupokea malipo ya usajili na kuweka kumbukumbu yake.',
          'Kutoa msaada, kuilinda huduma, kuzuia matumizi mabaya, na kuboresha SeamFlow.',
          'Hatuuzi taarifa zako binafsi, na hatutumii unachoandika kukutangazia.',
        ],
      },
      {
        heading: '5. Akili bandia',
        paragraphs: [
          'Vipengele kadhaa vya hiari hutuma data kwa Anthropic, wanaoendesha modeli inayojibu. Hakuna kinachofanya kazi bila wewe kuomba.',
          'Kueleza picha, kusoma vipimo kutoka kwenye picha, kupanga mtindo na kusafisha madokezo — kila kimoja hutuma picha moja au kipande kimoja cha maandishi ulichochagua, na si kingine.',
          'Msaidizi huenda mbali zaidi. Ili kujibu, anaweza kuangalia wateja wako, maagizo, vipimo, ankara, vitambaa na maagizo ya kikundi, na anachokiangalia hutumwa pamoja na swali lako. Anaweza pia kupendekeza badiliko — kuunda agizo, kwa mfano — lakini hakuna kinachohifadhiwa hadi uthibitishe skrini.',
          'Anthropic huchakata haya ili kutoa jibu, na hawatumii kufundishia modeli zao.',
          'Ukipendelea data ya biashara yako isifike kwa modeli yoyote, usitumie msaidizi. Kila kitu kingine katika SeamFlow kinafanya kazi bila yeye.',
        ],
      },
      {
        heading: '6. Malipo na usajili',
        paragraphs: [
          'Usajili unauzwa kupitia mtoa huduma wetu wa malipo, Fapshi, anayeshughulikia pesa za simu na kadi. Ili kupokea malipo tunampa kiasi, sarafu, kumbukumbu, na — kwa pesa za simu — namba unayolipia.',
          'Tunapokea taarifa kama malipo yalifanikiwa na kumbukumbu ya muamala, na tunavihifadhi vyote kama rekodi ya ulicholipa. Hatupokei wala hatuhifadhi namba kamili za kadi.',
        ],
      },
      {
        heading: '7. Uthibitisho',
        paragraphs: [
          'Uthibitisho ni wa hiari. Kutoufanya hakubadilishi chochote unachoweza kufanya katika SeamFlow.',
          'Kuthibitisha namba yako hutuma namba hiyo kwa Didit, wanaotuma msimbo wa mara moja kupitia WhatsApp au SMS na kutuambia kama msimbo uliouandika ulikuwa sahihi. Tunahifadhi namba na ukweli kwamba ilithibitishwa.',
          'Picha ya kazi unayopiga inaonwa tu na wafanyakazi wa SeamFlow wanaopitia ombi lako. Haitokei kamwe kwenye duka lako wala katika Gundua, na tunaifuta siku 90 baada ya kuamua.',
          'Ukiunganisha akaunti ya mtandao wa kijamii, jina unalotoa linakuwa la umma kwenye duka lako mara mtu wa timu yetu athibitishapo kuwa akaunti ni yako.',
          'Ukithibitisha eneo lako, programu huchukua usomaji mmoja wa mahali ulipo wakati unapogusa kitufe, na kamwe tena. Hakuna ufuatiliaji wa nyuma na hakuna kinachoendelea baadaye. Tunazungusha usomaji kabla haujatoka kwenye kifaa chako, tunauhifadhi na ombi lako la uthibitisho, na tunawaonyesha wateja mtaa pekee — kamwe si nukta kwenye ramani.',
          'Namba ya usajili wa biashara, ukitoa, inaonwa na wafanyakazi pekee na haichapishwi kamwe.',
        ],
      },
      {
        heading: '8. Watoa huduma',
        paragraphs: [
          'Tunategemea watoa huduma wachache kuendesha SeamFlow. Kila mmoja huchakata data kwa niaba yetu, chini ya ahadi zake za usalama na faragha.',
          'Supabase: hifadhidata, uthibitishaji na hifadhi ya mafaili. Render: seva ambazo programu huzungumza nazo. Vercel: upangishaji wa tovuti yetu na toleo la kivinjari la programu. Upstash: foleni za kazi za nyuma.',
          'Expo: kufikisha arifa. Resend: kutuma barua pepe. Didit: uthibitisho wa namba za simu. Fapshi: malipo. Anthropic: vipengele vya AI vilivyoelezwa katika sehemu ya 5. Sentry: ripoti za hitilafu zinazotusaidia kugundua na kurekebisha matatizo.',
        ],
      },
      {
        heading: '9. Data kuhusu watu unaowarekodi',
        paragraphs: [
          'Ukiendesha duka, taarifa za wateja unazoandika ni zako. Wewe huamua unachorekodi na kwa nini; sisi tunahifadhi na kuchakata kwa niaba yako, kwa ajili ya kukupa SeamFlow pekee. Ni jukumu lako kuwa na msingi sahihi wa kukusanya taarifa hizo na kuwajibika kwa jinsi unavyozitumia.',
          'Mteja mwenye akaunti yake mwenyewe ya SeamFlow ni tofauti. Akaunti yake, ujumbe wake na vipimo anavyochagua kushiriki ni uhusiano wake na sisi, si kitu unachokishikilia kwa niaba yake — hivyo anatumia haki zake moja kwa moja kwetu, nasi tunamjibu yeye.',
        ],
      },
      {
        heading: '10. Hifadhi, mahali na muda wa kutunza',
        paragraphs: [
          'Data yako huhifadhiwa kwenye miundombinu ya wingu ya watoa huduma wetu. Inaweza kuchakatwa katika nchi nyingine zaidi ya yako; inapotokea hivyo tunategemea ulinzi unaostahili.',
          'Ujumbe na maombi ya msaada huhifadhiwa kwenye seva zetu kama rekodi, ili simu iliyopotea au kubadilishwa isipoteze mazungumzo. Simu yako pia huweka nakala ya soga za hivi karibuni ili zifunguke haraka na zisomeke bila mtandao; nakala hiyo hufutwa unapotoka. Picha za ukubwa kamili zilizoshirikiwa kwenye soga huondolewa siku 90 baada ya agizo husika kukabidhiwa. Muhtasari mdogo hubaki, ili mazungumzo yaendelee kueleweka, na hakuna kinachoondolewa wakati agizo hilo lina ombi la msaada lililo wazi.',
          'Picha za uthibitisho hufutwa siku 90 baada ya kuamua kuhusu ombi. Ombi unaloliondoa husafishwa kwa muda uleule, ukihesabiwa tangu ulipolituma.',
          'Tunahifadhi data yako wakati akaunti yako ikiwa hai. Unapotuomba tufute akaunti yako, ukurasa wako wa umma huacha kuonekana mara moja na kila kitu hufutwa siku 30 baadaye. Ucheleweshaji huu upo ili uweze kubadili mawazo: ingia wakati wowote ndani ya siku hizo 30 na uchague “Weka akaunti yangu” kughairi. Baada ya hapo ni ya kudumu na hatuwezi kuirejesha.',
          'Vitu viwili hubaki baada ya kufutwa, na hakuna kinachokutambulisha. Ujumbe uliotuma hubaki kwenye mazungumzo ya mtu mwingine bila jina lako na bila maudhui, ili upande wake wa mazungumzo uendelee kueleweka. Na tunahifadhi kumbukumbu zisizomtambulisha mtu yeyote pale zinapohitajika ili huduma iendelee kufanya kazi kwa wengine.',
        ],
      },
      {
        heading: '11. Haki na chaguo zako',
        paragraphs: [
          'Unaweza kufikia data yako, kuirekebisha, kuihamisha au kuifuta. Kufuta akaunti yako, fungua programu na nenda Mipangilio → Akaunti → Futa akaunti yangu, ambapo pia unapewa nakala ya kila kitu kupakua kwanza. Kama huna tena programu, seamflowtech.com/delete-account inaeleza jinsi ya kutuomba. Kwa mengine yote, tuandikie nasi tutakusaidia.',
          'Unaweza pia kuzima arifa na barua pepe za mpango katika Mipangilio, kuondoa mtindo uliochapishwa, kuondoa ombi la uthibitisho likiwa bado mikononi mwetu, na kutuomba tuondoe alama ya uthibitisho.',
          'Kutegemea unapoishi, unaweza kuwa na haki za ziada chini ya sheria za nchi yako (kama haki ya kupinga au kuzuia uchakataji fulani).',
        ],
      },
      {
        heading: '12. Usalama',
        paragraphs: [
          'Tunalinda data yako kwa usimbaji wakati wa usafirishaji, udhibiti wa ufikiaji, na kufuli ya PIN ya hiari kwenye kifaa. Ufikiaji wa wafanyakazi kwa zana zinazoweza kusoma data ya akaunti unahitaji hatua ya pili wakati wa kuingia.',
          'Hakuna njia ya usafirishaji au hifadhi iliyo salama kwa asilimia 100, lakini tunafanya kazi kulinda taarifa zako na kujibu haraka tatizo lolote.',
        ],
      },
      {
        heading: '13. Watoto',
        paragraphs: [
          'SeamFlow hailengi watoto. Lazima uwe na angalau miaka 16 kuwa na akaunti, na hatukusanyi kwa makusudi taarifa binafsi za watu wadogo zaidi.',
        ],
      },
      {
        heading: '14. Mabadiliko ya sera hii',
        paragraphs: [
          'Tunaweza kusasisha sera hii kadri SeamFlow inavyoendelea. Tarehe ya “ilisasishwa mwisho” juu inaonyesha toleo la hivi karibuni, na tutafanya juhudi za busara kukujulisha mabadiliko makubwa.',
        ],
      },
      {
        heading: '15. Mawasiliano',
        paragraphs: [
          'Maswali kuhusu faragha? Tuandikie contactseamflow@gmail.com nasi tutakujibu.',
        ],
      },
    ],
  },

  ar: {
    intro:
      'توضّح سياسة الخصوصية هذه ما تجمعه SeamFlow («نحن»)، وكيف نستخدمه، والخيارات المتاحة لك. لـ SeamFlow وجهان: أداة يستخدمها الخيّاطون ومصمّمو الأزياء لإدارة أعمالهم، ومكان يجد فيه العملاء هؤلاء الخيّاطين ويطلبون قطعة ويتابعون الطلب. تغطّي هذه السياسة الوجهين معًا.',
    sections: [
      {
        heading: '١. على من تنطبق',
        paragraphs: [
          'هناك نوعان من الحسابات. حساب الورشة يخصّ خيّاطًا أو مصمّمًا يستخدم SeamFlow لإدارة العملاء والمقاسات والطلبات والفواتير والأقمشة، ولنشر أعماله كي يعثر عليها الناس.',
          'حساب العميل يخصّ من يبحث عن خيّاط. يمكنه تصفّح الأعمال المنشورة، وإرسال استفسار، والمحادثة، ومشاركة مقاساته الخاصة، ونشر طلب، ومتابعة طلبيّة.',
          'بعض أجزاء SeamFlow يمكن قراءتها دون أي حساب: الصفحة العامة للورشة، والتصاميم المنشورة في «اكتشف».',
          'حين تقول هذه السياسة «أنت»، فالمقصود ما ينطبق عليك من هذين. وحيث يختلف التعامل بينهما، نذكر ذلك صراحةً.',
        ],
      },
      {
        heading: '٢. المعلومات التي نجمعها',
        paragraphs: [
          'معلومات الحساب: البريد الإلكتروني و/أو رقم الهاتف الذي تسجّل به، وتفضيلاتك للّغة والعملة والبلد. ولحساب الورشة أيضًا اسم ورشتك ومدينتك وكل ما تختار وضعه على صفحتك العامة.',
          'ما تسجّله (حسابات الورش): أسماء عملائك وأرقامهم وعناوينهم ومقاساتهم؛ تفاصيل الطلبات وملاحظاتها وأسعارها وتواريخها؛ الطلبات الجماعية وأعضاؤها؛ الأقمشة؛ الفواتير؛ والصور التي ترفعها.',
          'ما ترسله كعميل: الاستفسارات والرسائل التي ترسلها إلى ورشة، والمقاسات التي تختار مشاركتها، والطلبات التي تنشرها، والطلبيّات التي أنشأتها لك ورشة.',
          'الرسائل والدعم: محتوى المحادثات بين الورشة والعميل، ومحتوى أي تذكرة دعم تفتحها، بما في ذلك الصور المرفقة.',
          'معلومات الدفع: عند شراء اشتراك نسجّل الخطة والمبلغ والعملة والوسيلة وما إذا نجح الدفع. تتطلّب مدفوعات المحفظة الهاتفية الرقم الذي تدفع منه. لا نرى أرقام البطاقات كاملةً ولا نخزّنها — فهي تذهب مباشرةً إلى مزوّد الدفع لدينا.',
          'الأذونات التي تمنحها: الكاميرا ومكتبة الصور (لإضافة الصور)، وجهات الاتصال (جهة واحدة فقط تختارها، لحفظ عميل)، والميكروفون والتعرّف على الكلام (فقط أثناء الضغط على زرّ الصوت في المساعد)، والموقع (انظر القسم ٧). يُطلب كلٌّ منها في لحظة الحاجة إليه، ويعمل SeamFlow بدونها جميعًا — تصبح تلك الميزة وحدها غير متاحة.',
          'بيانات الجهاز والاستخدام: رمز إشعارات كي نرسل إليك التذكيرات، ومعلومات أساسية عن الجهاز والتطبيق، وسجلّات معتادة تُستخدم لتشغيل الخدمة وتشخيص المشكلات.',
        ],
      },
      {
        heading: '٣. ما يمكن للآخرين رؤيته',
        paragraphs: [
          'معظم ما تسجّله خاص بك. دفتر عملائك وطلباتك ومقاساتك وفواتيرك ومحادثاتك لا يراها سواك — وفي المحادثة، الشخص الذي على الطرف الآخر.',
          'بعض ما يخصّ الورشة علنيّ: يقرأه أي شخص، بحساب على SeamFlow أو بدونه، وقد تفهرسه محرّكات البحث. وهو اسم ورشتك ومدينتك، والتصاميم التي تنشرها، وعلامة التوثيق إن كانت لديك، وحساب التواصل الذي تربطه إن شئت، وبعض المؤشّرات عن طريقة عملك مثل سرعة ردّك المعتادة وعدد الطلبات التي أنجزتها.',
          'النشر اختيار. لا يصبح التصميم علنيًّا إلا حين تنشره، ويمكنك سحبه في أي وقت.',
          'فكّر في الأشخاص الظاهرين في صورك. إذا ظهر في الصورة عميل أو عارض، فتأكّد من موافقته على ظهورها علنًا قبل نشرها.',
        ],
      },
      {
        heading: '٤. كيف نستخدم معلوماتك',
        paragraphs: [
          'لتقديم الخدمة الأساسية: حفظ عملك ومزامنته بين أجهزتك، وإيصال الرسائل، وتمكين العملاء من إيجاد الورش ومتابعة طلباتهم.',
          'لإرسال الإشعارات والتذكيرات التي فعّلتها (مثل مواعيد القياس والتسليم القادمة)، ورسائل البريد المتعلّقة بخطّتك التي وافقت على تلقّيها.',
          'لتحصيل قيمة الاشتراك والاحتفاظ بسجلّ له.',
          'لتقديم الدعم، والحفاظ على أمان الخدمة، ومنع إساءة الاستخدام، وتحسين SeamFlow.',
          'لا نبيع معلوماتك الشخصية، ولا نستخدم ما تُدخله لعرض إعلانات عليك.',
        ],
      },
      {
        heading: '٥. الذكاء الاصطناعي',
        paragraphs: [
          'ترسل عدّة ميزات اختيارية بيانات إلى Anthropic، التي تشغّل النموذج المُجيب. ولا يعمل أيٌّ منها ما لم تطلبه أنت.',
          'وصف صورة، وقراءة المقاسات من صورة، وتصنيف تصميم، وترتيب الملاحظات — كلٌّ منها يرسل الصورة الواحدة أو النصّ الواحد الذي اخترته، ولا شيء غير ذلك.',
          'أمّا المساعد فأوسع. للإجابة عن سؤالك قد يطّلع على عملائك وطلباتك ومقاساتك وفواتيرك وأقمشتك وطلباتك الجماعية، ويُرسَل ما يطّلع عليه مع سؤالك. ويمكنه كذلك اقتراح تغيير — إنشاء طلب مثلًا — لكن لا يُحفَظ شيء حتى تؤكّده على الشاشة.',
          'تعالج Anthropic هذه البيانات لإنتاج الإجابة ولا تستخدمها لتدريب نماذجها.',
          'إن كنت تفضّل ألّا تصل أي بيانات من عملك إلى نموذج، فلا تستخدم المساعد. وكل ما عداه في SeamFlow يعمل بدونه.',
        ],
      },
      {
        heading: '٦. المدفوعات والاشتراكات',
        paragraphs: [
          'تُباع الاشتراكات عبر مزوّد الدفع لدينا، Fapshi، الذي يتولّى المحفظة الهاتفية والبطاقات. ولتحصيل الدفعة نمرّر إليه المبلغ والعملة ومرجعًا، وللمحفظة الهاتفية الرقم الذي تدفع منه.',
          'ويعود إلينا ما إذا نجحت الدفعة ومرجع المعاملة، ونحتفظ بهما سجلًّا لما دفعته. ولا نتلقّى أرقام البطاقات كاملةً ولا نخزّنها.',
        ],
      },
      {
        heading: '٧. التوثيق',
        paragraphs: [
          'التوثيق اختياري. وتركه لا يغيّر شيئًا ممّا يمكنك فعله في SeamFlow.',
          'تأكيد رقم هاتفك يرسل الرقم إلى Didit، التي توصل رمزًا لمرّة واحدة عبر واتساب أو رسالة نصيّة وتخبرنا إن كان الرمز الذي كتبته صحيحًا. ونحتفظ بالرقم وبواقعة تأكيده.',
          'صورة العمل التي تلتقطها لا يراها إلا موظّفو SeamFlow المراجعون لطلبك. ولا تظهر أبدًا على ورشتك ولا في «اكتشف»، ونحذفها بعد ٩٠ يومًا من اتخاذ القرار.',
          'إذا ربطت حساب تواصل اجتماعي، يصبح المعرّف الذي تذكره علنيًّا على ورشتك بمجرّد تأكيد أحد أفراد فريقنا أن الحساب لك.',
          'إذا أكّدت منطقتك، يأخذ التطبيق قراءة موقع واحدة في لحظة ضغطك على الزرّ، ولا يعود إليها أبدًا. لا تتبّع في الخلفية ولا شيء يستمرّ بعدها. ونقرّب القراءة قبل أن تغادر جهازك، ونحفظها مع طلب التوثيق، ولا نُظهر للعملاء سوى الحيّ — لا نقطة على خريطة.',
          'رقم السجلّ التجاري، إن قدّمته، لا يراه إلا الموظّفون ولا يُنشر أبدًا.',
        ],
      },
      {
        heading: '٨. مزوّدو الخدمات',
        paragraphs: [
          'نعتمد على عدد قليل من المزوّدين لتشغيل SeamFlow. ويعالج كلٌّ منهم البيانات نيابةً عنّا، وفق التزاماته الخاصة بالأمان والخصوصية.',
          'Supabase: قاعدة البيانات والمصادقة وتخزين الملفات. Render: الخوادم التي تتحدّث إليها التطبيقات. Vercel: استضافة موقعنا ونسخة المتصفّح من التطبيق. Upstash: طوابير المهامّ الخلفية.',
          'Expo: إيصال الإشعارات. Resend: إرسال البريد الإلكتروني. Didit: توثيق أرقام الهواتف. Fapshi: المدفوعات. Anthropic: ميزات الذكاء الاصطناعي الموضّحة في القسم ٥. Sentry: تقارير الأخطاء التي تساعدنا على اكتشاف الأعطال وإصلاحها.',
        ],
      },
      {
        heading: '٩. بيانات الأشخاص الذين تسجّلهم',
        paragraphs: [
          'إن كنت تدير ورشة، فبيانات العملاء التي تكتبها بياناتك أنت. أنت من يقرّر ما يُسجَّل ولماذا؛ ونحن نخزّنها ونعالجها نيابةً عنك، لتقديم SeamFlow إليك وحده. وتقع عليك مسؤولية امتلاك أساس سليم لجمع تلك البيانات، ومسؤولية طريقة استخدامك لها.',
          'أمّا العميل الذي يملك حسابًا خاصًّا به على SeamFlow فالأمر مختلف. حسابه ورسائله والمقاسات التي يختار مشاركتها هي علاقته هو بنا، لا شيء تحتفظ به أنت نيابةً عنه — ولذلك يمارس حقوقه معنا مباشرةً، ونحن من يجيبه عنها.',
        ],
      },
      {
        heading: '١٠. التخزين والموقع ومدة الاحتفاظ',
        paragraphs: [
          'تُخزَّن بياناتك على البنية السحابية لمزوّدينا. وقد تُعالَج في بلدان غير بلدك؛ وحين يحدث ذلك نعتمد على ضمانات مناسبة.',
          'تُحفَظ الرسائل وطلبات الدعم على خوادمنا كسجلّ، حتى لا يفقد هاتف ضائع أو مُستبدَل محادثةً أبدًا. ويحتفظ هاتفك أيضًا بنسخة من المحادثات الأخيرة لتفتح بسرعة وتُقرأ دون اتصال؛ وتُمحى هذه النسخة عند تسجيل الخروج. وتُزال الصور بالحجم الكامل المشارَكة في محادثة بعد ٩٠ يومًا من تسليم الطلب المرتبط بها. وتبقى معاينة أصغر كي تظلّ المحادثة مفهومة، ولا يُزال شيء ما دام لذلك الطلب طلب دعم مفتوح.',
          'تُحذف صور التوثيق بعد ٩٠ يومًا من بتّنا في الطلب. والطلب الذي تسحبه يُمسح وفق المدّة نفسها، محسوبةً من وقت إرساله.',
          'نحتفظ ببياناتك ما دام حسابك نشطًا. وعندما تطلب حذف حسابك، تتوقّف صفحتك العامة عن الظهور فورًا ويُمحى كل شيء بعد ٣٠ يومًا. والمهلة موجودة كي تستطيع العدول: سجّل الدخول في أي وقت خلال تلك الأيام الثلاثين واختر «الاحتفاظ بحسابي» للإلغاء. وبعدها يصبح الحذف نهائيًّا ولا يمكننا استرجاع شيء لك.',
          'شيئان يبقيان بعد الحذف، ولا يدلّ أيٌّ منهما عليك. الرسائل التي أرسلتها تبقى في محادثة الطرف الآخر بعد إزالة اسمك ومحتواها، كي يظلّ جانبه من المحادثة مفهومًا. ونحتفظ بسجلّات لا تدلّ على أحد حيث تلزم لإبقاء الخدمة تعمل للآخرين.',
        ],
      },
      {
        heading: '١١. حقوقك وخياراتك',
        paragraphs: [
          'يمكنك الوصول إلى بياناتك وتصحيحها وتصديرها وحذفها. ولحذف حسابك، افتح التطبيق وانتقل إلى الإعدادات ← الحساب ← حذف حسابي، وهو يعرض عليك أيضًا تنزيل نسخة من كل شيء أولًا. وإن لم يعد التطبيق مثبّتًا لديك، يشرح seamflowtech.com/delete-account كيفية طلب ذلك منّا. ولأي أمر آخر، راسلنا وسنساعدك.',
          'ويمكنك أيضًا إيقاف الإشعارات ورسائل الخطة من الإعدادات، وسحب أي تصميم منشور، وسحب طلب توثيق ما دام لدينا، وطلب إزالة علامة التوثيق.',
          'وبحسب مكان إقامتك، قد تكون لك حقوق إضافية بموجب القانون المحلّي (مثل حقّ الاعتراض على بعض المعالجات أو تقييدها).',
        ],
      },
      {
        heading: '١٢. الأمان',
        paragraphs: [
          'نحمي بياناتك بالتشفير أثناء النقل، وضوابط الوصول، وقفل PIN اختياري على الجهاز. ويتطلّب وصول الموظّفين إلى الأدوات التي يمكنها قراءة بيانات الحسابات عاملًا ثانيًا عند تسجيل الدخول.',
          'لا توجد وسيلة نقل أو تخزين آمنة بنسبة ١٠٠٪، لكنّنا نعمل على حماية معلوماتك والاستجابة سريعًا لأي مشكلة.',
        ],
      },
      {
        heading: '١٣. الأطفال',
        paragraphs: [
          'SeamFlow ليست موجّهة للأطفال. يجب أن تكون في السادسة عشرة على الأقل لامتلاك حساب، ولا نجمع عن علم معلومات شخصية ممّن هم أصغر.',
        ],
      },
      {
        heading: '١٤. تغييرات هذه السياسة',
        paragraphs: [
          'قد نُحدّث هذه السياسة مع تطوّر SeamFlow. ويعكس تاريخ «آخر تحديث» في الأعلى أحدث نسخة، وسنبذل جهدًا معقولًا لإخطارك بالتغييرات الجوهرية.',
        ],
      },
      {
        heading: '١٥. التواصل',
        paragraphs: [
          'أسئلة عن الخصوصية؟ راسلنا على contactseamflow@gmail.com وسنعود إليك.',
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
          'SeamFlow is two things at once. For tailors and fashion designers it is a tool for managing clients, measurements, orders, invoices and published work. For customers it is a place to find a shop, ask for a piece, share measurements and follow an order.',
          'It is in active development and features may change, be added or be removed.',
        ],
      },
      {
        heading: '2. Who may use SeamFlow',
        paragraphs: [
          'You must be at least 16 years old to create an account.',
          'You may hold a shop account, a customer account, or both. These Terms apply to whichever you use.',
        ],
      },
      {
        heading: '3. Your account',
        paragraphs: [
          'You are responsible for keeping your login credentials secure and for the activity under your account. Tell us promptly if you suspect unauthorised use.',
        ],
      },
      {
        heading: '4. Work arranged between shops and customers',
        paragraphs: [
          'SeamFlow introduces shops and customers and gives them the tools to agree on work. The agreement itself is between the two of you. We are not a party to it.',
          'We do not set prices, hold your money, guarantee that a piece will be made, delivered, or made well, or check that anything said in a conversation is true. Payment for a garment is arranged between you directly — the only money that passes through SeamFlow is a subscription paid to us.',
          'If something goes wrong between a shop and a customer, you settle it between yourselves. We may help where we can, but we are not responsible for the outcome.',
        ],
      },
      {
        heading: '5. Acceptable use',
        paragraphs: [
          'Use SeamFlow only for lawful purposes. Do not misuse the service, attempt to disrupt or reverse-engineer it, or use it to store or share unlawful content.',
          'Do not publish work that is not yours, impersonate another shop or person, harass anyone, or send unsolicited advertising through messages.',
          'You are responsible for the client and order information you enter, and for respecting the privacy and rights of the people whose details you record.',
        ],
      },
      {
        heading: '6. Your content',
        paragraphs: [
          'You keep ownership of the data and photographs you enter. You grant us the limited rights needed to host, process and display them solely to provide SeamFlow — which, for anything you choose to publish, includes showing it publicly on your shop page and in Discover.',
          'By publishing a photograph you confirm that the work shown is yours, that you hold the rights to the image, and that anyone identifiable in it is content for it to appear publicly.',
          'That permission ends when you unpublish or delete the content, except for copies we must keep briefly for backups, or that another person already holds in their own conversation.',
        ],
      },
      {
        heading: '7. Work that is not yours',
        paragraphs: [
          'Publishing someone else’s work as your own is the thing most likely to damage this service for everyone on it, and we treat it seriously.',
          'If you believe something published on SeamFlow infringes your rights, email contactseamflow@gmail.com with a link to it, a description of the work, and enough information for us to reach you. We will review it and remove anything we find infringing.',
          'Accounts that repeatedly publish work belonging to others will be suspended.',
        ],
      },
      {
        heading: '8. Verification and the verified mark',
        paragraphs: [
          'Verification is optional and nothing in SeamFlow is withheld from a shop that skips it.',
          'The mark means we carried out a limited check: that a phone number is reachable, and that someone was able to photograph work in progress on request. Where a shop has linked a social account, a person on our team looked for a code in that profile. It is not a guarantee of quality, of identity, of business registration, or that any particular order will go well.',
          'We may decline a request, and we may withdraw the mark at any time — for example if a shop is found to be publishing work that is not its own.',
        ],
      },
      {
        heading: '9. Subscriptions and payments',
        paragraphs: [
          'Some features need a paid plan. The price, the currency and what each plan includes are shown in the app before you pay.',
          'Plans are sold for a fixed period and do not renew by themselves. When a period ends you choose whether to buy another. A period you have paid for runs to its end even if you stop using SeamFlow.',
          'Payments are taken through our payment provider and are not refundable, except where the law requires it or where we have failed to provide what you paid for. If you believe something was charged in error, email us.',
          'We may change prices. A change never affects a period you have already paid for.',
          'Where a free trial is offered, it lasts for the period stated in the app and obliges you to buy nothing.',
        ],
      },
      {
        heading: '10. Availability',
        paragraphs: [
          'We aim to keep SeamFlow reliable, but it is provided on an "as available" basis. We may modify, suspend or discontinue parts of the service, especially during early access.',
        ],
      },
      {
        heading: '11. Disclaimer',
        paragraphs: [
          'To the fullest extent permitted by law, SeamFlow is provided "as is" and "as available", without warranties of any kind, whether express or implied.',
        ],
      },
      {
        heading: '12. Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, we are not liable for any indirect, incidental, special or consequential damages, or for loss of data or profits, arising from your use of the service. Our total liability is limited to the amount you paid us in the twelve months before the claim (which may be zero).',
        ],
      },
      {
        heading: '13. Termination',
        paragraphs: [
          'You can stop using SeamFlow at any time, and delete your account from Settings. We may suspend or terminate access if these Terms are breached or to protect the service and its users.',
          'If a shop account is suspended, its public page stops being visible. Work already agreed with customers remains a matter between those parties.',
        ],
      },
      {
        heading: '14. Governing law',
        paragraphs: [
          'These Terms are governed by the laws of the Republic of Cameroon, and the courts of Cameroon have jurisdiction over any dispute arising from them.',
          'If you use SeamFlow from another country, you may still have rights under your own local law that this clause does not take away.',
        ],
      },
      {
        heading: '15. Changes & contact',
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
          'SeamFlow est deux choses à la fois. Pour les tailleurs et créateurs, c’est un outil de gestion des clients, mesures, commandes, factures et travaux publiés. Pour les clientes et clients, c’est un endroit où trouver un atelier, demander une pièce, partager ses mesures et suivre une commande.',
          'Le service est en développement actif : des fonctions peuvent changer, être ajoutées ou retirées.',
        ],
      },
      {
        heading: '2. Qui peut utiliser SeamFlow',
        paragraphs: [
          'Vous devez avoir au moins 16 ans pour créer un compte.',
          'Vous pouvez détenir un compte atelier, un compte client, ou les deux. Ces Conditions s’appliquent à celui que vous utilisez.',
        ],
      },
      {
        heading: '3. Votre compte',
        paragraphs: [
          'Vous êtes responsable de la sécurité de vos identifiants et de l’activité réalisée sous votre compte. Prévenez-nous rapidement si vous soupçonnez une utilisation non autorisée.',
        ],
      },
      {
        heading: '4. Le travail convenu entre ateliers et clients',
        paragraphs: [
          'SeamFlow met en relation ateliers et clients et leur donne les outils pour s’entendre sur un travail. L’accord lui-même vous lie tous les deux. Nous n’y sommes pas partie.',
          'Nous ne fixons pas les prix, ne détenons pas votre argent, ne garantissons pas qu’une pièce sera réalisée, livrée ou bien faite, et ne vérifions pas la véracité de ce qui se dit dans une conversation. Le paiement d’un vêtement s’organise directement entre vous : le seul argent qui transite par SeamFlow est un abonnement qui nous est versé.',
          'Si quelque chose se passe mal entre un atelier et un client, vous le réglez entre vous. Nous pouvons aider lorsque c’est possible, mais nous ne sommes pas responsables du résultat.',
        ],
      },
      {
        heading: '5. Usage acceptable',
        paragraphs: [
          'N’utilisez SeamFlow qu’à des fins licites. N’abusez pas du service, ne tentez pas de le perturber ni de l’analyser par rétro-ingénierie, et ne l’utilisez pas pour stocker ou diffuser des contenus illicites.',
          'Ne publiez pas un travail qui n’est pas le vôtre, n’usurpez pas l’identité d’un autre atelier ou d’une autre personne, ne harcelez personne et n’envoyez pas de publicité non sollicitée par message.',
          'Vous êtes responsable des informations clients et commandes que vous saisissez, et du respect de la vie privée et des droits des personnes dont vous enregistrez les données.',
        ],
      },
      {
        heading: '6. Vos contenus',
        paragraphs: [
          'Vous conservez la propriété des données et photographies que vous saisissez. Vous nous accordez les droits limités nécessaires pour les héberger, les traiter et les afficher dans le seul but de fournir SeamFlow — ce qui, pour tout ce que vous choisissez de publier, inclut leur affichage public sur votre page d’atelier et dans Découvrir.',
          'En publiant une photographie, vous confirmez que le travail montré est le vôtre, que vous détenez les droits sur l’image, et que toute personne identifiable accepte qu’elle paraisse publiquement.',
          'Cette autorisation prend fin lorsque vous retirez ou supprimez le contenu, à l’exception des copies que nous devons conserver brièvement pour les sauvegardes, ou que l’autre personne détient déjà dans sa propre conversation.',
        ],
      },
      {
        heading: '7. Le travail qui n’est pas le vôtre',
        paragraphs: [
          'Publier le travail d’autrui comme le sien est ce qui peut le plus abîmer ce service pour tout le monde, et nous le prenons au sérieux.',
          'Si vous estimez qu’un contenu publié sur SeamFlow porte atteinte à vos droits, écrivez à contactseamflow@gmail.com en joignant un lien, une description de l’œuvre et de quoi vous recontacter. Nous examinerons et retirerons ce que nous jugerons contrefaisant.',
          'Les comptes qui publient de façon répétée le travail d’autrui seront suspendus.',
        ],
      },
      {
        heading: '8. La vérification et la marque de vérification',
        paragraphs: [
          'La vérification est facultative et rien dans SeamFlow n’est refusé à un atelier qui ne la fait pas.',
          'La marque signifie que nous avons effectué un contrôle limité : qu’un numéro de téléphone est joignable, et qu’une personne a pu photographier un travail en cours à notre demande. Lorsqu’un atelier a associé un compte social, un membre de notre équipe y a cherché un code. Ce n’est pas une garantie de qualité, d’identité, d’enregistrement d’entreprise, ni qu’une commande se passera bien.',
          'Nous pouvons refuser une demande et retirer la marque à tout moment — par exemple s’il apparaît qu’un atelier publie un travail qui n’est pas le sien.',
        ],
      },
      {
        heading: '9. Abonnements et paiements',
        paragraphs: [
          'Certaines fonctions nécessitent une formule payante. Le prix, la devise et le contenu de chaque formule sont affichés dans l’application avant le paiement.',
          'Les formules sont vendues pour une période déterminée et ne se renouvellent pas d’elles-mêmes. À la fin d’une période, vous choisissez d’en acheter une autre ou non. Une période déjà payée va jusqu’à son terme même si vous cessez d’utiliser SeamFlow.',
          'Les paiements sont encaissés par notre prestataire et ne sont pas remboursables, sauf lorsque la loi l’exige ou lorsque nous n’avons pas fourni ce que vous avez payé. Si vous pensez qu’un montant a été prélevé par erreur, écrivez-nous.',
          'Nous pouvons modifier les prix. Une modification n’affecte jamais une période déjà payée.',
          'Lorsqu’un essai gratuit est proposé, il dure la période indiquée dans l’application et ne vous oblige à rien acheter.',
        ],
      },
      {
        heading: '10. Disponibilité',
        paragraphs: [
          'Nous visons la fiabilité, mais SeamFlow est fourni « tel que disponible ». Nous pouvons modifier, suspendre ou arrêter des parties du service, en particulier pendant l’accès anticipé.',
        ],
      },
      {
        heading: '11. Exclusion de garanties',
        paragraphs: [
          'Dans toute la mesure permise par la loi, SeamFlow est fourni « en l’état » et « tel que disponible », sans garantie d’aucune sorte, expresse ou implicite.',
        ],
      },
      {
        heading: '12. Limitation de responsabilité',
        paragraphs: [
          'Dans toute la mesure permise par la loi, nous ne sommes pas responsables des dommages indirects, accessoires, spéciaux ou consécutifs, ni des pertes de données ou de profits découlant de votre utilisation du service. Notre responsabilité totale est limitée au montant que vous nous avez versé au cours des douze mois précédant la réclamation (lequel peut être nul).',
        ],
      },
      {
        heading: '13. Résiliation',
        paragraphs: [
          'Vous pouvez cesser d’utiliser SeamFlow à tout moment et supprimer votre compte depuis les Réglages. Nous pouvons suspendre ou résilier l’accès en cas de manquement à ces Conditions ou pour protéger le service et ses utilisateurs.',
          'Si un compte atelier est suspendu, sa page publique cesse d’être visible. Le travail déjà convenu avec des clients demeure une affaire entre ces parties.',
        ],
      },
      {
        heading: '14. Droit applicable',
        paragraphs: [
          'Ces Conditions sont régies par le droit de la République du Cameroun, et les tribunaux camerounais sont compétents pour tout litige qui en découle.',
          'Si vous utilisez SeamFlow depuis un autre pays, vous pouvez conserver des droits au titre de votre droit local que cette clause ne retire pas.',
        ],
      },
      {
        heading: '15. Modifications et contact',
        paragraphs: [
          'Nous pouvons mettre à jour ces Conditions ; continuer à utiliser le service après une mise à jour vaut acceptation. Des questions ? Écrivez à contactseamflow@gmail.com.',
        ],
      },
    ],
  },

  pt: {
    intro:
      'Estes Termos regem a sua utilização do SeamFlow. Ao criar uma conta ou usar a aplicação, aceita-os.',
    sections: [
      {
        heading: '1. O serviço',
        paragraphs: [
          'O SeamFlow é duas coisas ao mesmo tempo. Para alfaiates e criadores de moda é uma ferramenta de gestão de clientes, medidas, encomendas, faturas e trabalho publicado. Para os clientes é um lugar onde encontrar uma oficina, pedir uma peça, partilhar medidas e acompanhar uma encomenda.',
          'Está em desenvolvimento ativo e as funcionalidades podem mudar, ser acrescentadas ou retiradas.',
        ],
      },
      {
        heading: '2. Quem pode usar o SeamFlow',
        paragraphs: [
          'Tem de ter pelo menos 16 anos para criar uma conta.',
          'Pode ter uma conta de oficina, uma conta de cliente, ou ambas. Estes Termos aplicam-se àquela que usar.',
        ],
      },
      {
        heading: '3. A sua conta',
        paragraphs: [
          'É responsável por manter as suas credenciais seguras e pela atividade realizada na sua conta. Avise-nos prontamente se suspeitar de uso não autorizado.',
        ],
      },
      {
        heading: '4. Trabalho combinado entre oficinas e clientes',
        paragraphs: [
          'O SeamFlow aproxima oficinas e clientes e dá-lhes as ferramentas para combinarem um trabalho. O acordo em si é entre os dois. Não somos parte nele.',
          'Não fixamos preços, não guardamos o seu dinheiro, não garantimos que uma peça será feita, entregue ou bem feita, nem verificamos se o que se diz numa conversa é verdade. O pagamento de uma peça é combinado diretamente entre vocês — o único dinheiro que passa pelo SeamFlow é uma subscrição paga a nós.',
          'Se algo correr mal entre uma oficina e um cliente, resolvem-no entre si. Podemos ajudar quando for possível, mas não somos responsáveis pelo resultado.',
        ],
      },
      {
        heading: '5. Uso aceitável',
        paragraphs: [
          'Use o SeamFlow apenas para fins lícitos. Não abuse do serviço, não tente perturbá-lo nem fazer engenharia inversa, e não o use para guardar ou partilhar conteúdo ilícito.',
          'Não publique trabalho que não é seu, não se faça passar por outra oficina ou pessoa, não assedie ninguém e não envie publicidade não solicitada por mensagem.',
          'É responsável pelas informações de clientes e encomendas que introduz, e por respeitar a privacidade e os direitos das pessoas cujos dados regista.',
        ],
      },
      {
        heading: '6. Os seus conteúdos',
        paragraphs: [
          'Mantém a propriedade dos dados e fotografias que introduz. Concede-nos os direitos limitados necessários para os alojar, tratar e mostrar com o único fim de prestar o SeamFlow — o que, para tudo o que escolher publicar, inclui mostrá-lo publicamente na sua página de oficina e em Descobrir.',
          'Ao publicar uma fotografia confirma que o trabalho mostrado é seu, que detém os direitos sobre a imagem, e que qualquer pessoa identificável nela aceita que apareça publicamente.',
          'Essa permissão termina quando retira ou apaga o conteúdo, exceto quanto a cópias que tenhamos de guardar brevemente para cópias de segurança, ou que outra pessoa já tenha na sua própria conversa.',
        ],
      },
      {
        heading: '7. Trabalho que não é seu',
        paragraphs: [
          'Publicar o trabalho de outra pessoa como sendo seu é o que mais pode prejudicar este serviço para toda a gente, e levamos isso a sério.',
          'Se acredita que algo publicado no SeamFlow viola os seus direitos, escreva para contactseamflow@gmail.com com uma ligação, uma descrição do trabalho e informação suficiente para o contactarmos. Analisaremos e removeremos o que considerarmos infrator.',
          'Contas que publiquem repetidamente trabalho alheio serão suspensas.',
        ],
      },
      {
        heading: '8. Verificação e a marca de verificação',
        paragraphs: [
          'A verificação é opcional e nada no SeamFlow é negado a uma oficina que a dispense.',
          'A marca significa que fizemos uma verificação limitada: que um número de telefone é contactável, e que alguém conseguiu fotografar trabalho em curso a pedido. Quando uma oficina associou uma conta social, alguém da nossa equipa procurou um código nesse perfil. Não é garantia de qualidade, de identidade, de registo comercial, nem de que uma encomenda em particular correrá bem.',
          'Podemos recusar um pedido e podemos retirar a marca a qualquer momento — por exemplo se se apurar que uma oficina publica trabalho que não é seu.',
        ],
      },
      {
        heading: '9. Subscrições e pagamentos',
        paragraphs: [
          'Algumas funcionalidades exigem um plano pago. O preço, a moeda e o que cada plano inclui são mostrados na aplicação antes de pagar.',
          'Os planos são vendidos por um período fixo e não se renovam sozinhos. No fim de um período escolhe se compra outro. Um período já pago decorre até ao fim mesmo que deixe de usar o SeamFlow.',
          'Os pagamentos são cobrados através do nosso fornecedor de pagamentos e não são reembolsáveis, salvo quando a lei o exija ou quando não tenhamos prestado aquilo que pagou. Se achar que algo foi cobrado por engano, escreva-nos.',
          'Podemos alterar preços. Uma alteração nunca afeta um período já pago.',
          'Quando houver período experimental gratuito, dura o tempo indicado na aplicação e não o obriga a comprar nada.',
        ],
      },
      {
        heading: '10. Disponibilidade',
        paragraphs: [
          'Procuramos manter o SeamFlow fiável, mas é fornecido «conforme disponível». Podemos alterar, suspender ou descontinuar partes do serviço, sobretudo durante o acesso antecipado.',
        ],
      },
      {
        heading: '11. Exclusão de garantias',
        paragraphs: [
          'Na máxima medida permitida por lei, o SeamFlow é fornecido «tal como está» e «conforme disponível», sem garantias de qualquer tipo, expressas ou implícitas.',
        ],
      },
      {
        heading: '12. Limitação de responsabilidade',
        paragraphs: [
          'Na máxima medida permitida por lei, não somos responsáveis por danos indiretos, incidentais, especiais ou consequenciais, nem por perda de dados ou lucros, decorrentes do seu uso do serviço. A nossa responsabilidade total está limitada ao valor que nos pagou nos doze meses anteriores à reclamação (que pode ser zero).',
        ],
      },
      {
        heading: '13. Cessação',
        paragraphs: [
          'Pode deixar de usar o SeamFlow a qualquer momento e apagar a sua conta nas Definições. Podemos suspender ou terminar o acesso em caso de violação destes Termos ou para proteger o serviço e os seus utilizadores.',
          'Se uma conta de oficina for suspensa, a sua página pública deixa de estar visível. O trabalho já combinado com clientes continua a ser assunto entre essas partes.',
        ],
      },
      {
        heading: '14. Lei aplicável',
        paragraphs: [
          'Estes Termos regem-se pela lei da República dos Camarões, e os tribunais dos Camarões têm competência para qualquer litígio deles decorrente.',
          'Se usar o SeamFlow a partir de outro país, pode manter direitos ao abrigo da sua lei local que esta cláusula não retira.',
        ],
      },
      {
        heading: '15. Alterações e contacto',
        paragraphs: [
          'Podemos atualizar estes Termos; continuar a usar o serviço após uma atualização significa que aceita a alteração. Dúvidas? Escreva para contactseamflow@gmail.com.',
        ],
      },
    ],
  },

  es: {
    intro:
      'Estos Términos rigen su uso de SeamFlow. Al crear una cuenta o usar la aplicación, los acepta.',
    sections: [
      {
        heading: '1. El servicio',
        paragraphs: [
          'SeamFlow es dos cosas a la vez. Para sastres y diseñadores de moda es una herramienta para gestionar clientes, medidas, pedidos, facturas y trabajo publicado. Para los clientes es un lugar donde encontrar un taller, pedir una prenda, compartir medidas y seguir un pedido.',
          'Está en desarrollo activo y las funciones pueden cambiar, añadirse o retirarse.',
        ],
      },
      {
        heading: '2. Quién puede usar SeamFlow',
        paragraphs: [
          'Debe tener al menos 16 años para crear una cuenta.',
          'Puede tener una cuenta de taller, una cuenta de cliente, o ambas. Estos Términos se aplican a la que use.',
        ],
      },
      {
        heading: '3. Su cuenta',
        paragraphs: [
          'Usted es responsable de mantener seguras sus credenciales y de la actividad realizada con su cuenta. Avísenos cuanto antes si sospecha un uso no autorizado.',
        ],
      },
      {
        heading: '4. El trabajo acordado entre talleres y clientes',
        paragraphs: [
          'SeamFlow pone en contacto a talleres y clientes y les da las herramientas para acordar un trabajo. El acuerdo en sí es entre ustedes dos. Nosotros no somos parte.',
          'No fijamos precios, no retenemos su dinero, no garantizamos que una prenda se haga, se entregue o se haga bien, ni comprobamos que lo dicho en una conversación sea cierto. El pago de una prenda se organiza directamente entre ustedes: el único dinero que pasa por SeamFlow es una suscripción pagada a nosotros.',
          'Si algo sale mal entre un taller y un cliente, lo resuelven entre ustedes. Podemos ayudar cuando esté en nuestra mano, pero no respondemos del resultado.',
        ],
      },
      {
        heading: '5. Uso aceptable',
        paragraphs: [
          'Use SeamFlow solo con fines lícitos. No abuse del servicio, no intente interrumpirlo ni aplicarle ingeniería inversa, y no lo use para almacenar o compartir contenido ilícito.',
          'No publique trabajo que no sea suyo, no suplante a otro taller o persona, no acose a nadie y no envíe publicidad no solicitada por mensaje.',
          'Es responsable de la información de clientes y pedidos que introduce, y de respetar la privacidad y los derechos de las personas cuyos datos registra.',
        ],
      },
      {
        heading: '6. Sus contenidos',
        paragraphs: [
          'Conserva la propiedad de los datos y fotografías que introduce. Nos concede los derechos limitados necesarios para alojarlos, tratarlos y mostrarlos con el único fin de prestarle SeamFlow, lo que, para todo lo que decida publicar, incluye mostrarlo públicamente en su página de taller y en Descubrir.',
          'Al publicar una fotografía confirma que el trabajo mostrado es suyo, que tiene los derechos sobre la imagen, y que cualquier persona identificable en ella acepta que aparezca públicamente.',
          'Ese permiso termina cuando retira o elimina el contenido, salvo copias que debamos conservar brevemente para copias de seguridad, o que otra persona ya tenga en su propia conversación.',
        ],
      },
      {
        heading: '7. El trabajo que no es suyo',
        paragraphs: [
          'Publicar el trabajo de otra persona como propio es lo que más puede dañar este servicio para todos, y lo tomamos en serio.',
          'Si cree que algo publicado en SeamFlow vulnera sus derechos, escriba a contactseamflow@gmail.com con un enlace, una descripción de la obra y datos suficientes para contactarle. Lo revisaremos y retiraremos lo que consideremos infractor.',
          'Las cuentas que publiquen repetidamente trabajo ajeno serán suspendidas.',
        ],
      },
      {
        heading: '8. La verificación y la marca de verificación',
        paragraphs: [
          'La verificación es opcional y no se le niega nada de SeamFlow a un taller que no la haga.',
          'La marca significa que hicimos una comprobación limitada: que un número de teléfono es localizable, y que alguien pudo fotografiar un trabajo en curso a petición. Cuando un taller ha vinculado una cuenta social, alguien de nuestro equipo buscó un código en ese perfil. No es garantía de calidad, de identidad, de registro mercantil, ni de que un pedido concreto vaya a salir bien.',
          'Podemos rechazar una solicitud y retirar la marca en cualquier momento, por ejemplo si se comprueba que un taller publica trabajo que no es suyo.',
        ],
      },
      {
        heading: '9. Suscripciones y pagos',
        paragraphs: [
          'Algunas funciones requieren un plan de pago. El precio, la moneda y lo que incluye cada plan se muestran en la aplicación antes de pagar.',
          'Los planes se venden por un periodo fijo y no se renuevan solos. Al terminar un periodo, usted decide si compra otro. Un periodo ya pagado llega a su fin aunque deje de usar SeamFlow.',
          'Los pagos se cobran a través de nuestro proveedor de pagos y no son reembolsables, salvo cuando la ley lo exija o cuando no hayamos prestado lo que usted pagó. Si cree que se ha cobrado algo por error, escríbanos.',
          'Podemos cambiar los precios. Un cambio nunca afecta a un periodo ya pagado.',
          'Cuando se ofrezca una prueba gratuita, durará el periodo indicado en la aplicación y no le obliga a comprar nada.',
        ],
      },
      {
        heading: '10. Disponibilidad',
        paragraphs: [
          'Procuramos que SeamFlow sea fiable, pero se presta «según disponibilidad». Podemos modificar, suspender o descontinuar partes del servicio, especialmente durante el acceso anticipado.',
        ],
      },
      {
        heading: '11. Exención de garantías',
        paragraphs: [
          'En la máxima medida permitida por la ley, SeamFlow se presta «tal cual» y «según disponibilidad», sin garantías de ningún tipo, expresas o implícitas.',
        ],
      },
      {
        heading: '12. Limitación de responsabilidad',
        paragraphs: [
          'En la máxima medida permitida por la ley, no respondemos de daños indirectos, incidentales, especiales o consecuentes, ni de la pérdida de datos o beneficios derivada de su uso del servicio. Nuestra responsabilidad total se limita al importe que nos haya pagado en los doce meses anteriores a la reclamación (que puede ser cero).',
        ],
      },
      {
        heading: '13. Terminación',
        paragraphs: [
          'Puede dejar de usar SeamFlow cuando quiera y eliminar su cuenta desde Ajustes. Podemos suspender o terminar el acceso si se incumplen estos Términos o para proteger el servicio y a sus usuarios.',
          'Si se suspende una cuenta de taller, su página pública deja de verse. El trabajo ya acordado con clientes sigue siendo asunto entre esas partes.',
        ],
      },
      {
        heading: '14. Ley aplicable',
        paragraphs: [
          'Estos Términos se rigen por las leyes de la República de Camerún, y los tribunales de Camerún son competentes para cualquier controversia derivada de ellos.',
          'Si usa SeamFlow desde otro país, puede conservar derechos conforme a su ley local que esta cláusula no le quita.',
        ],
      },
      {
        heading: '15. Cambios y contacto',
        paragraphs: [
          'Podemos actualizar estos Términos; seguir usando el servicio tras una actualización significa que acepta el cambio. ¿Preguntas? Escriba a contactseamflow@gmail.com.',
        ],
      },
    ],
  },

  sw: {
    intro:
      'Masharti haya yanaongoza matumizi yako ya SeamFlow. Kwa kufungua akaunti au kutumia programu, unayakubali.',
    sections: [
      {
        heading: '1. Huduma',
        paragraphs: [
          'SeamFlow ni vitu viwili kwa wakati mmoja. Kwa washonaji na wabunifu wa mavazi ni zana ya kusimamia wateja, vipimo, maagizo, ankara na kazi iliyochapishwa. Kwa wateja ni mahali pa kupata duka, kuomba kipande, kushiriki vipimo na kufuatilia agizo.',
          'Iko katika maendeleo endelevu, na vipengele vinaweza kubadilika, kuongezwa au kuondolewa.',
        ],
      },
      {
        heading: '2. Nani anaweza kutumia SeamFlow',
        paragraphs: [
          'Lazima uwe na angalau miaka 16 ili kufungua akaunti.',
          'Unaweza kuwa na akaunti ya duka, akaunti ya mteja, au zote mbili. Masharti haya yanahusu ile unayotumia.',
        ],
      },
      {
        heading: '3. Akaunti yako',
        paragraphs: [
          'Una wajibu wa kulinda taarifa zako za kuingia na shughuli zinazofanyika chini ya akaunti yako. Tujulishe haraka ukihisi matumizi yasiyoidhinishwa.',
        ],
      },
      {
        heading: '4. Kazi inayopangwa kati ya maduka na wateja',
        paragraphs: [
          'SeamFlow huwaunganisha maduka na wateja na kuwapa zana za kukubaliana kuhusu kazi. Makubaliano yenyewe ni kati yenu wawili. Sisi si upande ndani yake.',
          'Hatupangi bei, hatushiki pesa zako, hatuhakikishi kuwa kipande kitatengenezwa, kitakabidhiwa au kitatengenezwa vizuri, wala hatuthibitishi ukweli wa yanayosemwa katika mazungumzo. Malipo ya vazi hupangwa moja kwa moja kati yenu — pesa pekee inayopita SeamFlow ni usajili unaolipwa kwetu.',
          'Likitokea tatizo kati ya duka na mteja, mnalitatua wenyewe. Tunaweza kusaidia pale tunapoweza, lakini hatuwajibiki kwa matokeo.',
        ],
      },
      {
        heading: '5. Matumizi yanayokubalika',
        paragraphs: [
          'Tumia SeamFlow kwa madhumuni halali pekee. Usitumie vibaya huduma, usijaribu kuivuruga au kuichambua kwa njia ya kurudi nyuma, na usiitumie kuhifadhi au kushiriki maudhui haramu.',
          'Usichapishe kazi isiyo yako, usijifanye kuwa duka au mtu mwingine, usimsumbue yeyote, na usitume matangazo yasiyoombwa kupitia ujumbe.',
          'Una wajibu kwa taarifa za wateja na maagizo unazoingiza, na kwa kuheshimu faragha na haki za watu unaorekodi taarifa zao.',
        ],
      },
      {
        heading: '6. Maudhui yako',
        paragraphs: [
          'Unabaki na umiliki wa data na picha unazoingiza. Unatupa haki chache zinazohitajika kuzihifadhi, kuzichakata na kuzionyesha kwa ajili ya kutoa SeamFlow pekee — jambo ambalo, kwa chochote unachochagua kuchapisha, linajumuisha kukionyesha hadharani kwenye ukurasa wa duka lako na katika Gundua.',
          'Kwa kuchapisha picha, unathibitisha kuwa kazi inayoonyeshwa ni yako, kuwa una haki juu ya picha hiyo, na kuwa mtu yeyote anayetambulika ndani yake amekubali ionekane hadharani.',
          'Ruhusa hiyo hukoma unapoondoa au kufuta maudhui, isipokuwa nakala tunazopaswa kuzihifadhi kwa muda mfupi kwa ajili ya hifadhi rudufu, au ambazo mtu mwingine tayari anazo ndani ya mazungumzo yake.',
        ],
      },
      {
        heading: '7. Kazi isiyo yako',
        paragraphs: [
          'Kuchapisha kazi ya mtu mwingine kama yako ndilo jambo linaloweza kuiharibu huduma hii kwa kila mtu, nasi tunalichukulia kwa uzito.',
          'Ukiamini kuwa kilichochapishwa kwenye SeamFlow kinakiuka haki zako, tuandikie contactseamflow@gmail.com ukiweka kiungo, maelezo ya kazi, na taarifa za kutosha za kukufikia. Tutakipitia na kuondoa chochote tutakachokiona kinakiuka.',
          'Akaunti zinazochapisha mara kwa mara kazi za wengine zitasimamishwa.',
        ],
      },
      {
        heading: '8. Uthibitisho na alama ya uthibitisho',
        paragraphs: [
          'Uthibitisho ni wa hiari na hakuna kitu katika SeamFlow kinachonyimwa duka lisilofanya hivyo.',
          'Alama inamaanisha tumefanya ukaguzi mdogo: kwamba namba ya simu inapatikana, na kwamba mtu aliweza kupiga picha ya kazi inayoendelea tulipoomba. Pale duka lilipounganisha akaunti ya mtandao wa kijamii, mtu wa timu yetu alitafuta msimbo kwenye wasifu huo. Si dhamana ya ubora, wala ya utambulisho, wala ya usajili wa biashara, wala kwamba agizo fulani litakwenda vizuri.',
          'Tunaweza kukataa ombi, na tunaweza kuondoa alama wakati wowote — kwa mfano ikibainika kuwa duka linachapisha kazi isiyo yake.',
        ],
      },
      {
        heading: '9. Usajili na malipo',
        paragraphs: [
          'Baadhi ya vipengele vinahitaji mpango unaolipiwa. Bei, sarafu, na kinachojumuishwa katika kila mpango huonyeshwa ndani ya programu kabla ya kulipa.',
          'Mipango huuzwa kwa kipindi maalum na haijiongezi yenyewe. Kipindi kinapoisha, wewe huchagua kama kununua kingine. Kipindi ulicholipia huendelea hadi mwisho wake hata ukiacha kutumia SeamFlow.',
          'Malipo hupokelewa kupitia mtoa huduma wetu wa malipo na hayarudishwi, isipokuwa pale sheria inapotaka au pale tulipokosa kutoa ulicholipia. Ukiamini kuwa kitu kimetozwa kimakosa, tuandikie.',
          'Tunaweza kubadilisha bei. Badiliko haligusi kamwe kipindi ambacho tayari umekilipia.',
          'Pale jaribio la bure linapotolewa, hudumu kipindi kilichoelezwa ndani ya programu na halikulazimishi kununua chochote.',
        ],
      },
      {
        heading: '10. Upatikanaji',
        paragraphs: [
          'Tunalenga kuifanya SeamFlow iwe ya kutegemewa, lakini inatolewa “kadri inavyopatikana”. Tunaweza kubadilisha, kusitisha au kukomesha sehemu za huduma, hasa wakati wa ufikiaji wa awali.',
        ],
      },
      {
        heading: '11. Kanusho',
        paragraphs: [
          'Kwa kiwango cha juu kinachoruhusiwa na sheria, SeamFlow inatolewa “kama ilivyo” na “kadri inavyopatikana”, bila dhamana ya aina yoyote, iwe wazi au ya kudokezwa.',
        ],
      },
      {
        heading: '12. Ukomo wa dhima',
        paragraphs: [
          'Kwa kiwango cha juu kinachoruhusiwa na sheria, hatuwajibiki kwa hasara zisizo za moja kwa moja, za ajali, maalum au zinazofuatia, wala kwa upotevu wa data au faida, zitokanazo na matumizi yako ya huduma. Dhima yetu jumla ina ukomo wa kiasi ulicholipa kwetu katika miezi kumi na miwili kabla ya dai (ambacho kinaweza kuwa sifuri).',
        ],
      },
      {
        heading: '13. Kukomesha',
        paragraphs: [
          'Unaweza kuacha kutumia SeamFlow wakati wowote, na kufuta akaunti yako kutoka Mipangilio. Tunaweza kusimamisha au kukomesha ufikiaji endapo Masharti haya yatavunjwa au ili kuilinda huduma na watumiaji wake.',
          'Akaunti ya duka ikisimamishwa, ukurasa wake wa umma huacha kuonekana. Kazi iliyokwisha kukubaliwa na wateja hubaki jambo kati ya pande hizo.',
        ],
      },
      {
        heading: '14. Sheria inayotumika',
        paragraphs: [
          'Masharti haya yanaongozwa na sheria za Jamhuri ya Kameruni, na mahakama za Kameruni zina mamlaka juu ya mgogoro wowote utokanao nayo.',
          'Ukitumia SeamFlow ukiwa nchi nyingine, unaweza kuwa bado na haki chini ya sheria za nchi yako ambazo kipengele hiki hakikuondolei.',
        ],
      },
      {
        heading: '15. Mabadiliko na mawasiliano',
        paragraphs: [
          'Tunaweza kusasisha Masharti haya; kuendelea kutumia huduma baada ya sasisho kunamaanisha unakubali badiliko. Maswali? Tuandikie contactseamflow@gmail.com.',
        ],
      },
    ],
  },

  ar: {
    intro:
      'تحكم هذه الشروط استخدامك لـ SeamFlow. وبإنشائك حسابًا أو استخدامك التطبيق، فإنك توافق عليها.',
    sections: [
      {
        heading: '١. الخدمة',
        paragraphs: [
          'SeamFlow شيئان في آنٍ واحد. فهي للخيّاطين ومصمّمي الأزياء أداة لإدارة العملاء والمقاسات والطلبات والفواتير والأعمال المنشورة. وهي للعملاء مكانٌ لإيجاد ورشة، وطلب قطعة، ومشاركة المقاسات، ومتابعة الطلب.',
          'والخدمة قيد تطوير مستمرّ، وقد تتغيّر الميزات أو تُضاف أو تُزال.',
        ],
      },
      {
        heading: '٢. من يجوز له استخدام SeamFlow',
        paragraphs: [
          'يجب أن تكون في السادسة عشرة على الأقل لإنشاء حساب.',
          'يمكنك امتلاك حساب ورشة أو حساب عميل أو كليهما. وتنطبق هذه الشروط على أيٍّ منهما تستخدمه.',
        ],
      },
      {
        heading: '٣. حسابك',
        paragraphs: [
          'أنت مسؤول عن الحفاظ على سرّية بيانات دخولك وعن النشاط الجاري تحت حسابك. أخبرنا فورًا إذا اشتبهت في استخدام غير مصرّح به.',
        ],
      },
      {
        heading: '٤. العمل المتّفق عليه بين الورش والعملاء',
        paragraphs: [
          'تجمع SeamFlow بين الورش والعملاء وتمنحهم أدوات الاتّفاق على العمل. أمّا الاتّفاق نفسه فهو بينكما أنتما، ولسنا طرفًا فيه.',
          'نحن لا نحدّد الأسعار، ولا نحتفظ بأموالك، ولا نضمن أن تُصنع القطعة أو تُسلَّم أو تُتقَن، ولا نتحقّق من صحّة ما يُقال في المحادثة. ويُرتَّب دفع ثمن الثوب بينكما مباشرةً — فالمال الوحيد الذي يمرّ عبر SeamFlow هو اشتراك يُدفَع لنا.',
          'وإذا ساء شيء بين ورشة وعميل، فأنتما من يسوّيه. وقد نساعد حيث نستطيع، لكنّنا غير مسؤولين عن النتيجة.',
        ],
      },
      {
        heading: '٥. الاستخدام المقبول',
        paragraphs: [
          'استخدم SeamFlow لأغراض مشروعة فقط. لا تُسئ استخدام الخدمة، ولا تحاول تعطيلها أو هندستها عكسيًّا، ولا تستخدمها لتخزين محتوى غير مشروع أو مشاركته.',
          'لا تنشر عملًا ليس لك، ولا تنتحل صفة ورشة أو شخص آخر، ولا تضايق أحدًا، ولا ترسل إعلانات غير مطلوبة عبر الرسائل.',
          'أنت مسؤول عن معلومات العملاء والطلبات التي تُدخلها، وعن احترام خصوصية وحقوق الأشخاص الذين تسجّل بياناتهم.',
        ],
      },
      {
        heading: '٦. محتواك',
        paragraphs: [
          'تحتفظ بملكية البيانات والصور التي تُدخلها. وتمنحنا الحقوق المحدودة اللازمة لاستضافتها ومعالجتها وعرضها لغرض تقديم SeamFlow وحده — وهو ما يشمل، لكل ما تختار نشره، عرضه علنًا على صفحة ورشتك وفي «اكتشف».',
          'وبنشرك صورةً، فإنك تؤكّد أن العمل الظاهر فيها لك، وأنك تملك حقوق الصورة، وأن كل شخص يمكن التعرّف عليه فيها موافق على ظهورها علنًا.',
          'وينتهي هذا الإذن عند سحبك المحتوى أو حذفه، باستثناء نسخ يلزمنا الاحتفاظ بها مدّةً وجيزة للنسخ الاحتياطي، أو نسخ يملكها شخص آخر مسبقًا داخل محادثته.',
        ],
      },
      {
        heading: '٧. العمل الذي ليس لك',
        paragraphs: [
          'نشر عمل الآخرين على أنّه عملك هو أكثر ما يمكن أن يضرّ هذه الخدمة لكل من فيها، ونحن نأخذه على محمل الجدّ.',
          'إذا رأيت أن شيئًا منشورًا على SeamFlow ينتهك حقوقك، فراسلنا على contactseamflow@gmail.com مع رابط إليه، ووصف للعمل، ومعلومات تكفي للوصول إليك. وسنراجعه ونزيل ما نجده منتهِكًا.',
          'وتُعلَّق الحسابات التي تنشر مرارًا أعمالًا تخصّ غيرها.',
        ],
      },
      {
        heading: '٨. التوثيق وعلامة التوثيق',
        paragraphs: [
          'التوثيق اختياري، ولا يُحجَب أي شيء في SeamFlow عن ورشة لم تقم به.',
          'وتعني العلامة أنّنا أجرينا فحصًا محدودًا: أن رقم هاتف يمكن الوصول إليه، وأن شخصًا تمكّن من تصوير عمل قيد التنفيذ عند الطلب. وحيث ربطت ورشة حساب تواصل اجتماعي، بحث أحد أفراد فريقنا عن رمز في ذلك الحساب. وليست العلامة ضمانًا للجودة ولا للهوية ولا للتسجيل التجاري، ولا ضمانًا لأن طلبًا بعينه سيسير على ما يرام.',
          'ويجوز لنا رفض طلب، كما يجوز لنا سحب العلامة في أي وقت — مثلًا إذا تبيّن أن ورشة تنشر عملًا ليس لها.',
        ],
      },
      {
        heading: '٩. الاشتراكات والمدفوعات',
        paragraphs: [
          'بعض الميزات تتطلّب خطة مدفوعة. ويُعرَض السعر والعملة وما تشمله كل خطة داخل التطبيق قبل الدفع.',
          'وتُباع الخطط لمدّة محدّدة ولا تتجدّد من تلقاء نفسها. وعند انتهاء المدّة تختار أنت شراء مدّة أخرى أو لا. والمدّة التي دفعتها تستمرّ حتى نهايتها حتى لو توقّفت عن استخدام SeamFlow.',
          'وتُحصَّل المدفوعات عبر مزوّد الدفع لدينا وهي غير قابلة للاسترداد، إلّا حيث يوجب القانون ذلك أو حيث أخفقنا في تقديم ما دفعت مقابله. وإن رأيت أن مبلغًا حُصِّل خطأً، فراسلنا.',
          'وقد نغيّر الأسعار. ولا يمسّ التغيير أبدًا مدّةً سبق أن دفعت ثمنها.',
          'وحيثما تُعرَض فترة تجريبية مجانية، فإنها تدوم المدّة المذكورة في التطبيق ولا تُلزمك بشراء شيء.',
        ],
      },
      {
        heading: '١٠. التوافر',
        paragraphs: [
          'نسعى إلى إبقاء SeamFlow موثوقة، لكنّها تُقدَّم «حسب التوافر». وقد نعدّل أجزاءً من الخدمة أو نوقفها أو نلغيها، لا سيّما خلال مرحلة الوصول المبكّر.',
        ],
      },
      {
        heading: '١١. إخلاء المسؤولية',
        paragraphs: [
          'إلى أقصى حدّ يسمح به القانون، تُقدَّم SeamFlow «كما هي» و«حسب التوافر»، دون أي ضمانات من أي نوع، صريحة كانت أو ضمنية.',
        ],
      },
      {
        heading: '١٢. حدود المسؤولية',
        paragraphs: [
          'إلى أقصى حدّ يسمح به القانون، لا نتحمّل المسؤولية عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية، ولا عن فقدان البيانات أو الأرباح، الناشئة عن استخدامك للخدمة. وتقتصر مسؤوليتنا الإجمالية على المبلغ الذي دفعته لنا خلال الاثني عشر شهرًا السابقة للمطالبة (وقد يكون صفرًا).',
        ],
      },
      {
        heading: '١٣. الإنهاء',
        paragraphs: [
          'يمكنك التوقّف عن استخدام SeamFlow في أي وقت، وحذف حسابك من الإعدادات. ويجوز لنا تعليق الوصول أو إنهاؤه عند مخالفة هذه الشروط أو لحماية الخدمة ومستخدميها.',
          'وإذا عُلِّق حساب ورشة، تتوقّف صفحته العامة عن الظهور. ويبقى العمل المتّفق عليه مسبقًا مع العملاء شأنًا بين هذين الطرفين.',
        ],
      },
      {
        heading: '١٤. القانون الحاكم',
        paragraphs: [
          'تخضع هذه الشروط لقوانين جمهورية الكاميرون، وتختصّ محاكم الكاميرون بأي نزاع ينشأ عنها.',
          'وإذا استخدمت SeamFlow من بلد آخر، فقد تبقى لك حقوق بموجب قانونك المحلّي لا يسلبها هذا البند.',
        ],
      },
      {
        heading: '١٥. التغييرات والتواصل',
        paragraphs: [
          'قد نُحدّث هذه الشروط؛ ويعني استمرارك في الاستخدام بعد التحديث قبولك للتغيير. أسئلة؟ راسلنا على contactseamflow@gmail.com.',
        ],
      },
    ],
  },
};
