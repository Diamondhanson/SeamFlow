// ============================================================================
// Legal page content (Privacy Policy + Terms), one block per language. Kept out of components
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
  es: {
    intro:
      'Esta Política de Privacidad explica qué recopila SeamFlow («nosotros»), cómo lo usamos y qué opciones tiene usted. SeamFlow es una herramienta para que sastres y diseñadores de moda gestionen clientes, medidas y pedidos.',
    sections: [
      {
        heading: '1. Información que recopilamos',
        paragraphs: [
          'Información de la cuenta: el correo electrónico o el número de teléfono con el que se registra, el nombre de su negocio, y sus preferencias de idioma, moneda y país.',
          'Datos que usted introduce sobre su trabajo: nombres, teléfonos, direcciones y medidas de sus clientes; detalles, notas y fechas de los pedidos; pedidos de grupo y sus miembros; telas; y cualquier foto que suba (imágenes de referencia, muestras de tela, inspiración de diseño y fotos de trabajos terminados).',
          'Datos del dispositivo y de uso: un identificador para notificaciones push que nos permite enviarle recordatorios, información básica del dispositivo y de la app, y registros estándar que usamos para mantener el servicio en marcha y diagnosticar problemas.',
        ],
      },
      {
        heading: '2. Cómo usamos su información',
        paragraphs: [
          'Para prestar el servicio principal: guardar y sincronizar sus clientes, pedidos y medidas entre sus dispositivos.',
          'Para enviar las notificaciones y recordatorios que usted haya activado (por ejemplo, pruebas y fechas de entrega próximas).',
          'Para dar soporte, mantener el servicio seguro, prevenir abusos y mejorar el funcionamiento de SeamFlow.',
          'No vendemos su información personal, y no usamos el contenido que usted introduce para mostrarle publicidad.',
        ],
      },
      {
        heading: '3. Proveedores de servicios',
        paragraphs: [
          'Nos apoyamos en un pequeño número de proveedores de confianza para operar SeamFlow: Supabase (base de datos, autenticación y almacenamiento de archivos), Expo (entrega de notificaciones push) y Upstash (colas de trabajos en segundo plano).',
          'Si usa la función opcional de IA «describir imagen», la imagen concreta que elija se envía a Anthropic para generar notas de diseño. Esto solo ocurre cuando usted usa activamente esa función.',
          'Estos proveedores tratan los datos por cuenta nuestra, bajo sus propios compromisos de seguridad y privacidad.',
        ],
      },
      {
        heading: '4. Datos sobre sus clientes',
        paragraphs: [
          'La información de clientes que usted introduce son datos que usted controla. Usted es responsable de tener una base adecuada para recopilar y guardar los datos de sus clientes, y del uso que haga de ellos.',
          'Nosotros tratamos esa información por cuenta suya, únicamente para prestarle SeamFlow.',
        ],
      },
      {
        heading: '5. Almacenamiento, ubicación y conservación',
        paragraphs: [
          'Sus datos se guardan en la infraestructura en la nube de nuestros proveedores. Pueden tratarse en países distintos al suyo; cuando eso ocurre nos apoyamos en las salvaguardas adecuadas.',
          'Conservamos sus datos mientras su cuenta esté activa. Cuando nos pide eliminar su cuenta, su página pública deja de ser visible de inmediato y todo se borra 30 días después. La demora existe para que pueda cambiar de opinión: inicie sesión en cualquier momento de esos 30 días y elija «Conservar mi cuenta» para cancelarlo. Después de eso es definitivo y no podemos recuperarlo.',
          'Dos cosas sobreviven a una eliminación, y ninguna lo identifica. Los mensajes que envió quedan en la conversación de la otra persona sin su nombre y sin su contenido, para que su lado del hilo siga teniendo sentido. Y conservamos registros que no identifican a nadie cuando hacen falta para que el servicio siga funcionando para los demás.',
        ],
      },
      {
        heading: '6. Sus derechos',
        paragraphs: [
          'Puede acceder a sus datos, corregirlos, exportarlos o eliminarlos. Para eliminar su cuenta, abra la app y vaya a Ajustes → Cuenta → Eliminar mi cuenta, donde además se le ofrece descargar antes una copia de todo. Si ya no tiene la app instalada, seamflowtech.com/delete-account explica cómo pedírnoslo. Para cualquier otra cosa, escríbanos y le ayudamos.',
          'Según dónde viva, puede tener derechos adicionales conforme a la ley local (como el derecho a oponerse a determinados tratamientos o a limitarlos).',
        ],
      },
      {
        heading: '7. Seguridad',
        paragraphs: [
          'Protegemos sus datos con cifrado en tránsito, controles de acceso y un bloqueo opcional con PIN en el dispositivo. Ningún método de transmisión o almacenamiento es 100 % seguro, pero trabajamos para proteger su información y responder rápido ante cualquier incidencia.',
        ],
      },
      {
        heading: '8. Menores',
        paragraphs: [
          'SeamFlow es una herramienta de negocio y no está dirigida a menores. No recopilamos conscientemente información personal de menores de 16 años.',
        ],
      },
      {
        heading: '9. Cambios en esta política',
        paragraphs: [
          'Podemos actualizar esta política a medida que SeamFlow evoluciona. La fecha de «última actualización» en la parte superior refleja la versión más reciente, y haremos esfuerzos razonables por avisarle de los cambios importantes.',
        ],
      },
      {
        heading: '10. Contacto',
        paragraphs: [
          '¿Preguntas sobre privacidad? Escríbanos a contactseamflow@gmail.com y le responderemos.',
        ],
      },
    ],
  },
  sw: {
    intro:
      'Sera hii ya Faragha inaeleza SeamFlow (“sisi”) tunachokusanya, jinsi tunavyokitumia, na chaguo ulizo nazo. SeamFlow ni zana ya washonaji na wabunifu wa mavazi kusimamia wateja, vipimo na maagizo.',
    sections: [
      {
        heading: '1. Taarifa tunazokusanya',
        paragraphs: [
          'Taarifa za akaunti: barua pepe na/au namba ya simu unayojisajili nayo, jina la biashara yako, na mapendeleo yako ya lugha, sarafu na nchi.',
          'Data unayoweka kuhusu kazi yako: majina ya wateja wako, namba za simu, anwani na vipimo vyao; maelezo ya maagizo, madokezo na tarehe; maagizo ya kikundi na wanachama wake; vitambaa; na picha zozote unazopakia (picha za rejeleo, sampuli za vitambaa, msukumo wa ubunifu na picha za kazi zilizokamilika).',
          'Data ya kifaa na matumizi: tokeni ya arifa za papo hapo ili tuweze kukutumia vikumbusho, taarifa za msingi za kifaa na programu, na kumbukumbu za kawaida tunazotumia kuendesha huduma na kuchunguza matatizo.',
        ],
      },
      {
        heading: '2. Jinsi tunavyotumia taarifa zako',
        paragraphs: [
          'Kutoa huduma kuu: kuhifadhi na kusawazisha wateja, maagizo na vipimo vyako kwenye vifaa vyako.',
          'Kutuma arifa na vikumbusho ulivyowasha (kwa mfano, kufitisha kunakokuja na tarehe za kukabidhi).',
          'Kutoa msaada, kuweka huduma salama, kuzuia matumizi mabaya, na kuboresha jinsi SeamFlow inavyofanya kazi.',
          'Hatuuzi taarifa zako binafsi, wala hatutumii maudhui unayoweka kukutangazia bidhaa.',
        ],
      },
      {
        heading: '3. Watoa huduma',
        paragraphs: [
          'Tunategemea watoa huduma wachache wa kuaminika kuendesha SeamFlow: Supabase (hifadhidata, uthibitishaji na uhifadhi wa faili), Expo (utoaji wa arifa za papo hapo), na Upstash (foleni za kazi za nyuma).',
          'Ukitumia kipengele cha hiari cha AI cha “eleza picha”, picha uliyoichagua hutumwa kwa Anthropic ili kutengeneza maelezo ya ubunifu. Hili hutokea tu unapokitumia kipengele hicho kwa makusudi.',
          'Watoa huduma hawa hushughulikia data kwa niaba yetu chini ya ahadi zao za usalama na faragha.',
        ],
      },
      {
        heading: '4. Data kuhusu wateja wako',
        paragraphs: [
          'Taarifa za wateja unazoweka ni data unayoidhibiti wewe. Wewe ndiye unayewajibika kuwa na msingi sahihi wa kukusanya na kuhifadhi taarifa za wateja wako, na jinsi unavyozitumia.',
          'Sisi tunashughulikia taarifa hizo kwa niaba yako, kwa lengo la kukupatia SeamFlow pekee.',
        ],
      },
      {
        heading: '5. Uhifadhi, mahali na muda',
        paragraphs: [
          'Data yako huhifadhiwa kwenye miundombinu ya wingu ya watoa huduma wetu. Inaweza kushughulikiwa katika nchi tofauti na yako; hilo linapotokea tunategemea kinga zinazostahili.',
          'Tunahifadhi data yako muda wote akaunti yako ikiwa hai. Unapotuomba tufute akaunti yako, ukurasa wako wa umma huacha kuonekana mara moja na kila kitu hufutwa baada ya siku 30. Ucheleweshaji huu upo ili uweze kubadilisha nia: ingia wakati wowote ndani ya siku hizo 30 kisha uchague “Weka akaunti yangu” ili kughairi. Baada ya hapo ni ya kudumu na hatuwezi kukurudishia.',
          'Vitu viwili hubaki baada ya ufutaji, na hakuna kinachokutambulisha. Ujumbe uliotuma hubaki kwenye mazungumzo ya mtu mwingine ukiwa umeondolewa jina lako na maudhui yake, ili upande wake wa mazungumzo uendelee kueleweka. Na tunahifadhi kumbukumbu zisizomtambulisha mtu yeyote pale zinapohitajika ili huduma iendelee kufanya kazi kwa wengine.',
        ],
      },
      {
        heading: '6. Haki zako',
        paragraphs: [
          'Unaweza kufikia, kusahihisha, kuhamisha au kufuta data yako. Ili kufuta akaunti yako, fungua programu kisha uende Mipangilio → Akaunti → Futa akaunti yangu, ambapo pia unapewa nafasi ya kupakua nakala ya kila kitu kwanza. Kama huna tena programu, seamflowtech.com/delete-account inaeleza jinsi ya kutuomba. Kwa jambo lolote jingine, tuandikie nasi tutakusaidia.',
          'Kutegemea unapoishi, unaweza kuwa na haki za ziada chini ya sheria za nchi yako (kama haki ya kupinga au kuzuia baadhi ya matumizi ya data).',
        ],
      },
      {
        heading: '7. Usalama',
        paragraphs: [
          'Tunailinda data yako kwa usimbaji fiche wakati wa usafirishaji, udhibiti wa ufikiaji, na kufuli ya hiari ya PIN kwenye kifaa. Hakuna njia ya kusafirisha au kuhifadhi data iliyo salama kwa asilimia 100, lakini tunafanya kazi kulinda taarifa zako na kujibu haraka tatizo lolote.',
        ],
      },
      {
        heading: '8. Watoto',
        paragraphs: [
          'SeamFlow ni zana ya biashara na haikusudiwi watoto. Hatukusanyi kwa kujua taarifa binafsi za watoto walio chini ya miaka 16.',
        ],
      },
      {
        heading: '9. Mabadiliko ya sera hii',
        paragraphs: [
          'Tunaweza kusasisha sera hii SeamFlow inapokua. Tarehe ya “ilisasishwa mwisho” iliyo juu inaonyesha toleo la hivi punde, nasi tutafanya juhudi zinazostahili kukujulisha mabadiliko makubwa.',
        ],
      },
      {
        heading: '10. Wasiliana nasi',
        paragraphs: [
          'Una maswali kuhusu faragha? Tuandikie kwa contactseamflow@gmail.com nasi tutakujibu.',
        ],
      },
    ],
  },
  ar: {
    intro:
      'توضّح سياسة الخصوصية هذه ما تجمعه SeamFlow («نحن»)، وكيف نستخدمه، والخيارات المتاحة لك. SeamFlow أداة للخيّاطين ومصمّمي الأزياء لإدارة العملاء والمقاسات والطلبات.',
    sections: [
      {
        heading: '1. المعلومات التي نجمعها',
        paragraphs: [
          'معلومات الحساب: البريد الإلكتروني و/أو رقم الهاتف الذي تسجّل به، واسم عملك، وتفضيلاتك في اللغة والعملة والبلد.',
          'البيانات التي تُدخلها عن عملك: أسماء عملائك وأرقام هواتفهم وعناوينهم ومقاساتهم؛ وتفاصيل الطلبات وملاحظاتها وتواريخها؛ وطلبات المجموعات وأعضاؤها؛ والأقمشة؛ وأي صور ترفعها (صور مرجعية، وعيّنات أقمشة، وإلهام التصميم، وصور الأعمال المنجزة).',
          'بيانات الجهاز والاستخدام: رمز للإشعارات الفورية كي نتمكّن من إرسال التذكيرات، ومعلومات أساسية عن الجهاز والتطبيق، وسجلّات معيارية نستخدمها لتشغيل الخدمة وتشخيص الأعطال.',
        ],
      },
      {
        heading: '2. كيف نستخدم معلوماتك',
        paragraphs: [
          'لتقديم الخدمة الأساسية: تخزين عملائك وطلباتك ومقاساتك ومزامنتها بين أجهزتك.',
          'لإرسال الإشعارات والتذكيرات التي فعّلتها (مثل مواعيد القياس والتسليم القادمة).',
          'لتقديم الدعم، والحفاظ على أمان الخدمة، ومنع إساءة الاستخدام، وتحسين طريقة عمل SeamFlow.',
          'نحن لا نبيع معلوماتك الشخصية، ولا نستخدم المحتوى الذي تُدخله لعرض إعلانات عليك.',
        ],
      },
      {
        heading: '3. مزوّدو الخدمة',
        paragraphs: [
          'نعتمد على عدد محدود من المزوّدين الموثوقين لتشغيل SeamFlow: Supabase (قاعدة البيانات والمصادقة وتخزين الملفات)، وExpo (إيصال الإشعارات الفورية)، وUpstash (طوابير المهام في الخلفية).',
          'إذا استخدمت ميزة «وصف الصورة» الاختيارية العاملة بالذكاء الاصطناعي، تُرسَل الصورة التي تختارها تحديدًا إلى Anthropic لتوليد ملاحظات التصميم. ولا يحدث ذلك إلا حين تستخدم هذه الميزة بنفسك.',
          'يعالج هؤلاء المزوّدون البيانات نيابةً عنّا وفق التزاماتهم الخاصة بالأمان والخصوصية.',
        ],
      },
      {
        heading: '4. بيانات عملائك',
        paragraphs: [
          'معلومات العملاء التي تُدخلها بيانات تتحكّم أنت بها. وأنت المسؤول عن امتلاك أساس سليم لجمع بيانات عملائك وحفظها، وعن كيفية استخدامك لها.',
          'ونحن نعالج تلك المعلومات نيابةً عنك، لغرض تقديم SeamFlow لك فقط.',
        ],
      },
      {
        heading: '5. التخزين والموقع ومدة الاحتفاظ',
        paragraphs: [
          'تُحفَظ بياناتك على البنية السحابية لمزوّدينا. وقد تُعالَج في بلدان غير بلدك؛ وعندما يحدث ذلك نعتمد على الضمانات المناسبة.',
          'نحتفظ ببياناتك ما دام حسابك نشطًا. وعندما تطلب حذف حسابك، تتوقّف صفحتك العامة عن الظهور فورًا ويُمحى كل شيء بعد 30 يومًا. وهذه المهلة موجودة كي تتمكّن من العدول: سجّل الدخول في أي وقت خلالها واختر «الاحتفاظ بحسابي» للإلغاء. وبعد 30 يومًا يصبح الحذف نهائيًا ولا يمكننا استرجاعه.',
          'يبقى أمران بعد الحذف، ولا يُعرِّف أيٌّ منهما بك. الرسائل التي أرسلتها تبقى في محادثة الطرف الآخر بعد إزالة اسمك ومحتواها، كي يظل جانبه من المحادثة مفهومًا. ونحتفظ بسجلّات لا تُعرِّف بأي شخص حيث تكون لازمة لاستمرار عمل الخدمة للآخرين.',
        ],
      },
      {
        heading: '6. حقوقك',
        paragraphs: [
          'يمكنك الاطّلاع على بياناتك وتصحيحها وتصديرها وحذفها. ولحذف حسابك، افتح التطبيق وانتقل إلى الإعدادات ← الحساب ← حذف حسابي، حيث يُعرض عليك أيضًا تنزيل نسخة من كل شيء أولًا. وإذا لم يعد التطبيق مثبّتًا لديك، تشرح صفحة seamflowtech.com/delete-account كيفية طلب ذلك منّا. ولأي أمر آخر، راسلنا وسنساعدك.',
          'وبحسب مكان إقامتك، قد تكون لديك حقوق إضافية بموجب القانون المحلي (مثل حق الاعتراض على بعض أنواع المعالجة أو تقييدها).',
        ],
      },
      {
        heading: '7. الأمان',
        paragraphs: [
          'نحمي بياناتك بالتشفير أثناء النقل، وضوابط الوصول، وقفل اختياري برمز PIN على الجهاز. لا توجد وسيلة نقل أو تخزين آمنة بنسبة 100٪، لكننا نعمل على حماية معلوماتك والاستجابة سريعًا لأي مشكلة.',
        ],
      },
      {
        heading: '8. الأطفال',
        paragraphs: [
          'SeamFlow أداة عمل وليست موجّهة للأطفال. ونحن لا نجمع عن علم معلومات شخصية من أطفال دون سن السادسة عشرة.',
        ],
      },
      {
        heading: '9. التعديلات على هذه السياسة',
        paragraphs: [
          'قد نُحدّث هذه السياسة مع تطوّر SeamFlow. ويعكس تاريخ «آخر تحديث» في الأعلى أحدث نسخة، وسنبذل جهدًا معقولًا لإعلامك بالتغييرات الجوهرية.',
        ],
      },
      {
        heading: '10. التواصل',
        paragraphs: [
          'لديك سؤال عن الخصوصية؟ راسلنا على contactseamflow@gmail.com وسنردّ عليك.',
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
  es: {
    intro:
      'Estos Términos rigen su uso de SeamFlow. Al crear una cuenta o usar la app, usted los acepta.',
    sections: [
      {
        heading: '1. El servicio',
        paragraphs: [
          'SeamFlow es una herramienta para gestionar clientes de sastrería, medidas, pedidos y el trabajo relacionado. Está en desarrollo activo y sus funciones pueden cambiar, añadirse o retirarse.',
        ],
      },
      {
        heading: '2. Su cuenta',
        paragraphs: [
          'Usted es responsable de mantener seguras sus credenciales de acceso y de la actividad realizada bajo su cuenta. Avísenos enseguida si sospecha de un uso no autorizado.',
        ],
      },
      {
        heading: '3. Uso aceptable',
        paragraphs: [
          'Use SeamFlow solo con fines lícitos. No haga un uso indebido del servicio, no intente interrumpirlo ni aplicarle ingeniería inversa, ni lo utilice para guardar o compartir contenido ilícito.',
          'Usted es responsable de la información de clientes y pedidos que introduce, y de respetar la privacidad y los derechos de las personas cuyos datos registra.',
        ],
      },
      {
        heading: '4. Su contenido',
        paragraphs: [
          'Usted conserva la propiedad de los datos que introduce. Nos concede los derechos limitados necesarios para alojar, tratar y mostrar esos datos con el único fin de prestarle SeamFlow.',
        ],
      },
      {
        heading: '5. Disponibilidad',
        paragraphs: [
          'Procuramos que SeamFlow sea fiable, pero se presta «según disponibilidad». Podemos modificar, suspender o retirar partes del servicio, especialmente durante el acceso anticipado.',
        ],
      },
      {
        heading: '6. Exención de garantías',
        paragraphs: [
          'En la máxima medida permitida por la ley, SeamFlow se presta «tal cual» y «según disponibilidad», sin garantías de ningún tipo, expresas o implícitas.',
        ],
      },
      {
        heading: '7. Limitación de responsabilidad',
        paragraphs: [
          'En la máxima medida permitida por la ley, no respondemos de daños indirectos, incidentales, especiales o consecuentes, ni de la pérdida de datos o de beneficios derivada de su uso del servicio. Nuestra responsabilidad total se limita al importe que usted nos haya pagado en los doce meses anteriores a la reclamación (que puede ser cero durante el acceso anticipado gratuito).',
        ],
      },
      {
        heading: '8. Terminación',
        paragraphs: [
          'Puede dejar de usar SeamFlow cuando quiera. Podemos suspender o cancelar el acceso si se incumplen estos Términos o para proteger el servicio y a sus usuarios.',
        ],
      },
      {
        heading: '9. Ley aplicable',
        paragraphs: [
          'Estos Términos se rigen por las leyes de la jurisdicción en la que se opera SeamFlow. (Pendiente de concretar antes del lanzamiento.)',
        ],
      },
      {
        heading: '10. Cambios y contacto',
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
          'SeamFlow ni zana ya kusimamia wateja wa ushonaji, vipimo, maagizo na kazi zinazohusiana. Ipo katika ujenzi unaoendelea na vipengele vyake vinaweza kubadilika, kuongezwa au kuondolewa.',
        ],
      },
      {
        heading: '2. Akaunti yako',
        paragraphs: [
          'Wewe ndiye unayewajibika kuweka salama taarifa zako za kuingia na shughuli zote zinazofanyika chini ya akaunti yako. Tujulishe mara moja ukishuku matumizi yasiyoruhusiwa.',
        ],
      },
      {
        heading: '3. Matumizi yanayokubalika',
        paragraphs: [
          'Tumia SeamFlow kwa madhumuni halali pekee. Usitumie vibaya huduma hii, usijaribu kuiharibu au kuichambua kinyume cha sheria, wala usiitumie kuhifadhi au kushiriki maudhui yasiyo halali.',
          'Wewe ndiye unayewajibika kwa taarifa za wateja na maagizo unazoweka, na kwa kuheshimu faragha na haki za watu ambao taarifa zao unaziandika.',
        ],
      },
      {
        heading: '4. Maudhui yako',
        paragraphs: [
          'Unabaki na umiliki wa data unayoweka. Unatupa haki chache zinazohitajika kuhifadhi, kushughulikia na kuonyesha data hiyo kwa lengo la kukupatia SeamFlow pekee.',
        ],
      },
      {
        heading: '5. Upatikanaji',
        paragraphs: [
          'Tunalenga kuweka SeamFlow ikitegemewa, lakini hutolewa “kadri inavyopatikana”. Tunaweza kubadilisha, kusimamisha au kuondoa sehemu za huduma, hasa wakati wa awamu ya awali.',
        ],
      },
      {
        heading: '6. Kanusho',
        paragraphs: [
          'Kwa kadri sheria inavyoruhusu, SeamFlow hutolewa “kama ilivyo” na “kadri inavyopatikana”, bila dhamana ya aina yoyote, iwe iliyotamkwa au inayodokezwa.',
        ],
      },
      {
        heading: '7. Ukomo wa dhima',
        paragraphs: [
          'Kwa kadri sheria inavyoruhusu, hatuwajibiki kwa hasara zisizo za moja kwa moja, za bahati mbaya, maalum au zinazofuatia, wala kwa upotevu wa data au faida, unaotokana na matumizi yako ya huduma. Dhima yetu yote ina ukomo wa kiasi ulichotulipa katika miezi kumi na miwili kabla ya dai (ambacho kinaweza kuwa sifuri wakati wa awamu ya awali ya bure).',
        ],
      },
      {
        heading: '8. Kusitisha',
        paragraphs: [
          'Unaweza kuacha kutumia SeamFlow wakati wowote. Tunaweza kusimamisha au kusitisha ufikiaji kama Masharti haya yatavunjwa au ili kulinda huduma na watumiaji wake.',
        ],
      },
      {
        heading: '9. Sheria inayotumika',
        paragraphs: [
          'Masharti haya yanaongozwa na sheria za eneo ambalo SeamFlow inaendeshwa. (Yatakamilishwa kabla ya uzinduzi.)',
        ],
      },
      {
        heading: '10. Mabadiliko na mawasiliano',
        paragraphs: [
          'Tunaweza kusasisha Masharti haya; kuendelea kutumia baada ya sasisho kunamaanisha umekubali mabadiliko. Una maswali? Andika kwa contactseamflow@gmail.com.',
        ],
      },
    ],
  },
  ar: {
    intro:
      'تحكم هذه الشروط استخدامك لـ SeamFlow. وبإنشاء حساب أو استخدام التطبيق، فإنك توافق عليها.',
    sections: [
      {
        heading: '1. الخدمة',
        paragraphs: [
          'SeamFlow أداة لإدارة عملاء الخياطة والمقاسات والطلبات والأعمال المرتبطة بها. وهي قيد التطوير النشط، وقد تتغيّر ميزاتها أو تُضاف أو تُزال.',
        ],
      },
      {
        heading: '2. حسابك',
        paragraphs: [
          'أنت مسؤول عن الحفاظ على سرّية بيانات دخولك وعن النشاط الذي يجري تحت حسابك. أبلغنا فورًا إذا اشتبهت في استخدام غير مصرّح به.',
        ],
      },
      {
        heading: '3. الاستخدام المقبول',
        paragraphs: [
          'استخدم SeamFlow لأغراض مشروعة فقط. لا تُسِئ استخدام الخدمة، ولا تحاول تعطيلها أو إجراء هندسة عكسية عليها، ولا تستخدمها لتخزين محتوى غير قانوني أو مشاركته.',
          'وأنت مسؤول عن معلومات العملاء والطلبات التي تُدخلها، وعن احترام خصوصية وحقوق الأشخاص الذين تسجّل بياناتهم.',
        ],
      },
      {
        heading: '4. المحتوى الخاص بك',
        paragraphs: [
          'تحتفظ بملكية البيانات التي تُدخلها. وتمنحنا الحقوق المحدودة اللازمة لاستضافة تلك البيانات ومعالجتها وعرضها، لغرض تقديم SeamFlow لك فقط.',
        ],
      },
      {
        heading: '5. التوافر',
        paragraphs: [
          'نسعى إلى إبقاء SeamFlow موثوقًا، لكنه يُقدَّم «حسب توافره». وقد نُعدّل أجزاءً من الخدمة أو نوقفها أو نلغيها، خصوصًا أثناء مرحلة الوصول المبكر.',
        ],
      },
      {
        heading: '6. إخلاء المسؤولية',
        paragraphs: [
          'إلى أقصى حدّ يسمح به القانون، يُقدَّم SeamFlow «كما هو» و«حسب توافره»، دون أي ضمانات من أي نوع، صريحة كانت أو ضمنية.',
        ],
      },
      {
        heading: '7. حدود المسؤولية',
        paragraphs: [
          'إلى أقصى حدّ يسمح به القانون، لا نتحمّل مسؤولية أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية، ولا فقدان البيانات أو الأرباح، الناشئة عن استخدامك للخدمة. وتقتصر مسؤوليتنا الإجمالية على المبلغ الذي دفعته لنا خلال الاثني عشر شهرًا السابقة للمطالبة (وقد يكون صفرًا خلال مرحلة الوصول المبكر المجانية).',
        ],
      },
      {
        heading: '8. إنهاء الخدمة',
        paragraphs: [
          'يمكنك التوقّف عن استخدام SeamFlow في أي وقت. ويجوز لنا تعليق الوصول أو إنهاؤه عند مخالفة هذه الشروط أو لحماية الخدمة ومستخدميها.',
        ],
      },
      {
        heading: '9. القانون الواجب التطبيق',
        paragraphs: [
          'تخضع هذه الشروط لقوانين الولاية القضائية التي تُشغَّل فيها SeamFlow. (سيُحدَّد ذلك نهائيًا قبل الإطلاق.)',
        ],
      },
      {
        heading: '10. التعديلات والتواصل',
        paragraphs: [
          'قد نُحدّث هذه الشروط؛ واستمرارك في الاستخدام بعد التحديث يعني قبولك للتغيير. لديك سؤال؟ راسلنا على contactseamflow@gmail.com.',
        ],
      },
    ],
  },
};
