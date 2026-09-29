// ============================================================================
// Verification — proving a shop is real (appendix J).
//
// The copy here carries the one rule: nothing about verification blocks
// anybody. Every string that could read as a requirement says the opposite out
// loud — "skipping it changes nothing", "entirely optional" — because a tailor
// who believes they must do this, and cannot, will simply leave.
//
// The step-two text is the longest string in the app on purpose. A camera-only
// picker with no explanation reads as a broken feature, and people work around
// things they think are broken; explaining that the live photo IS the check is
// what makes it land as reasonable rather than as an obstacle.
// ============================================================================

export const verification = {
  en: {
    title: 'Get verified',
    statusVerified: 'Verified',
    statusPending: 'Waiting on us',
    statusDeclined: 'Not yet',
    statusNone: 'Not started',
    lede:
      'Two steps, about five minutes. It shows clients the work in your shop is your own. Skipping it changes nothing: you keep every feature, and you still appear in Discover.',
    ledeVerified:
      'Your shop is verified. You can send this again if anything about your shop has changed.',
    alreadyVerified: 'SeamFlow has confirmed your shop.',
    step1Title: 'Confirm your phone number',
    step1Body: 'So a client can tell there is a reachable person behind the shop.',
    step1Action: 'Confirm my number',
    step2Title: 'Show us a piece you made',
    step2Body:
      'This opens your camera, and only your camera. Photograph something you are working on now, on the machine or the cutting table. Or re-shoot a piece from your feed from a new angle with a note showing your shop name and today\u2019s date. That is the whole check: anyone can save a picture, only you can take this one.',
    step2Action: 'Open the camera',
    step2Another: 'Take another',
    submitAction: 'Send for review',
    needPhoneFirst: 'Confirm your phone number to send this.',
    sentTitle: 'Sent',
    sentBody: 'We usually look within two days. We will let you know either way.',
    pendingBody: 'Your request is with us. We usually look within two days.',
    declinedBody: 'We could not verify your shop yet. {reason}',
    withdrawAction: 'Take my request back',
    withdrawTitle: 'Take it back?',
    withdrawBody: 'We will stop looking. You can send a new request whenever you like.',
    privacyNote:
      'Only SeamFlow staff see these photos, and we delete them 90 days after we decide. They never appear on your shop or in Discover.',
    promptTitle: 'Show clients the work is yours',
    promptBody:
      'Verified shops carry a mark clients can tap to see what we checked. Two steps, about five minutes. Entirely optional.',
    promptAction: 'Start',
    promptLater: 'Not now',
    promptDeclinedTitle: 'Your verification needs one more thing',
    promptDeclinedBody: 'We could not verify your shop yet. Open it to see why and send it again.',
    promptDeclinedAction: 'See why',
    extrasTitle: 'Make your shop stronger',
    extrasLede:
      'Optional, and nothing here is needed to be verified. Each one gives a client one more reason to believe you.',
    socialTitle: 'Link a social account',
    socialBody:
      'We give you a short code to put in your bio for a day. A person on our team looks for it, which is how we know the account is really yours. Your handle then shows on your shop.',
    socialAction: 'Link an account',
    socialChange: 'Use a different account',
    socialPending:
      'Waiting on @{handle}. Put {code} anywhere in your bio and leave it there until we have looked.',
    socialPickTitle: 'Which account?',
    socialInstagram: 'Instagram',
    socialFacebook: 'Facebook',
    socialTiktok: 'TikTok',
    socialHandleTitle: 'Your handle',
    socialHandleBody: 'Just the name, without the @. You can paste the link to your profile instead.',
    socialHandlePlaceholder: 'yourshopname',
    socialCodeTitle: 'Put this in your bio',
    socialCodeBody:
      'Add {code} anywhere in your bio and leave it there until we have looked. Your profile has to be public for us to see it. You can take it out once you are verified.',
    registrationTitle: 'Business registration number',
    registrationBody:
      'Only if you have one. Most shops do not, and not having one counts against nobody.',
    registrationLabel: 'Registration number',
    areaTitle: 'Confirm your area',
    areaBody:
      'Take one reading while you are standing in your shop. It tells us your address is real. Clients only ever see your neighbourhood, never a pin on a map.',
    areaAction: 'Confirm where I am',
    areaRedo: 'Take it again',
    areaDone: 'Done. We have one reading from where you were standing.',
    areaConfirmTitle: 'Once, and only now',
    areaConfirmBody:
      'SeamFlow reads your location one time, right now, and never again. We do not follow you, we do not run in the background, and there is nothing here to switch off later because nothing keeps running. Are you at your shop?',
    areaConfirmAction: 'Yes, I am here',
    areaDeniedTitle: 'No location, no problem',
    areaDeniedBody:
      'Nothing is lost. This step is optional and everything else about your verification still works.',
    areaDeniedSettings:
      'Your phone is set to refuse. You can turn location on for SeamFlow in your phone settings, or simply skip this: it is optional and everything else still works.',
    areaFailedTitle: 'Could not get a reading',
    areaFailedBody:
      'Your phone could not find where it is. Standing near a window or stepping outside usually fixes it. You can also skip this.',
    badgeTitle: 'Verified shop',
    badgeWork: 'SeamFlow has confirmed the work in this shop is their own.',
    badgeWorkOn: 'SeamFlow confirmed the work in this shop is their own, {date}.',
    badgePhone: 'Their phone number is confirmed, so they can be reached.',
    badgeSince: 'On SeamFlow since {date}.',
    badgeOrders: '{count} orders completed through SeamFlow.',
    badgeOrdersOne: '1 order completed through SeamFlow.',
    badgeReplies: 'Usually replies within {hours}h.',
    badgeFootnote: 'This is not a rating. It means we checked the shop is real, not that we judged their work.',
  },
  fr: {
    title: 'Faire vérifier mon atelier',
    statusVerified: 'Vérifié',
    statusPending: 'En attente de notre réponse',
    statusDeclined: 'Pas encore',
    statusNone: 'Pas commencé',
    lede:
      'Deux étapes, environ cinq minutes. Cela montre aux clientes que le travail de votre atelier est bien le vôtre. Ne rien faire ne change rien : vous gardez toutes les fonctions et vous apparaissez toujours dans Découvrir.',
    ledeVerified:
      'Votre atelier est vérifié. Vous pouvez renvoyer une demande si quelque chose a changé.',
    alreadyVerified: 'SeamFlow a confirmé votre atelier.',
    step1Title: 'Confirmez votre numéro de téléphone',
    step1Body: 'Pour qu’une cliente sache qu’une personne joignable tient l’atelier.',
    step1Action: 'Confirmer mon numéro',
    step2Title: 'Montrez-nous une pièce que vous avez faite',
    step2Body:
      'Cela ouvre votre appareil photo, et rien d’autre. Photographiez ce sur quoi vous travaillez maintenant, sur la machine ou sur la table de coupe. Ou reprenez une pièce de votre vitrine sous un autre angle, avec un mot montrant le nom de votre atelier et la date du jour. C’est tout le contrôle : n’importe qui peut enregistrer une image, vous seule pouvez prendre celle-ci.',
    step2Action: 'Ouvrir l’appareil photo',
    step2Another: 'En prendre une autre',
    submitAction: 'Envoyer pour vérification',
    needPhoneFirst: 'Confirmez votre numéro de téléphone pour envoyer.',
    sentTitle: 'Envoyé',
    sentBody: 'Nous regardons généralement sous deux jours. Nous vous répondrons dans tous les cas.',
    pendingBody: 'Votre demande est chez nous. Nous regardons généralement sous deux jours.',
    declinedBody: 'Nous n’avons pas encore pu vérifier votre atelier. {reason}',
    withdrawAction: 'Retirer ma demande',
    withdrawTitle: 'Retirer la demande ?',
    withdrawBody: 'Nous arrêterons de l’examiner. Vous pourrez en envoyer une autre quand vous voudrez.',
    privacyNote:
      'Seule l’équipe SeamFlow voit ces photos, et nous les supprimons 90 jours après notre réponse. Elles n’apparaissent jamais sur votre vitrine ni dans Découvrir.',
    promptTitle: 'Montrez aux clientes que ce travail est le vôtre',
    promptBody:
      'Les ateliers vérifiés portent une marque sur laquelle les clientes peuvent appuyer pour voir ce que nous avons contrôlé. Deux étapes, environ cinq minutes. Entièrement facultatif.',
    promptAction: 'Commencer',
    promptLater: 'Plus tard',
    promptDeclinedTitle: 'Il manque une chose à votre vérification',
    promptDeclinedBody:
      'Nous n’avons pas encore pu vérifier votre atelier. Ouvrez pour voir pourquoi et renvoyer.',
    promptDeclinedAction: 'Voir pourquoi',
    extrasTitle: 'Renforcez votre atelier',
    extrasLede:
      'Facultatif : rien ici n’est nécessaire pour être vérifié. Chaque élément donne à une cliente une raison de plus de vous croire.',
    socialTitle: 'Associer un compte social',
    socialBody:
      'Nous vous donnons un code court à mettre dans votre bio pendant une journée. Une personne de notre équipe le cherche : c’est ainsi que nous savons que le compte est bien le vôtre. Votre identifiant s’affiche ensuite sur votre vitrine.',
    socialAction: 'Associer un compte',
    socialChange: 'Utiliser un autre compte',
    socialPending:
      'En attente de @{handle}. Mettez {code} quelque part dans votre bio et laissez-le jusqu’à notre vérification.',
    socialPickTitle: 'Quel compte ?',
    socialInstagram: 'Instagram',
    socialFacebook: 'Facebook',
    socialTiktok: 'TikTok',
    socialHandleTitle: 'Votre identifiant',
    socialHandleBody: 'Juste le nom, sans le @. Vous pouvez aussi coller le lien de votre profil.',
    socialHandlePlaceholder: 'nomdevotreatelier',
    socialCodeTitle: 'Mettez ceci dans votre bio',
    socialCodeBody:
      'Ajoutez {code} quelque part dans votre bio et laissez-le jusqu’à notre vérification. Votre profil doit être public pour que nous puissions le voir. Vous pourrez le retirer une fois vérifié.',
    registrationTitle: 'Numéro de registre de commerce',
    registrationBody:
      'Seulement si vous en avez un. La plupart des ateliers n’en ont pas, et ne pas en avoir ne pénalise personne.',
    registrationLabel: 'Numéro de registre',
    areaTitle: 'Confirmez votre quartier',
    areaBody:
      'Prenez une seule mesure pendant que vous êtes dans votre atelier. Cela nous montre que votre adresse est réelle. Les clientes ne voient que votre quartier, jamais un point sur une carte.',
    areaAction: 'Confirmer où je suis',
    areaRedo: 'Reprendre la mesure',
    areaDone: 'C’est fait. Nous avons une mesure prise là où vous étiez.',
    areaConfirmTitle: 'Une fois, et maintenant seulement',
    areaConfirmBody:
      'SeamFlow lit votre position une seule fois, maintenant, et plus jamais. Nous ne vous suivons pas, rien ne tourne en arrière-plan, et il n’y aura rien à désactiver plus tard puisque rien ne continue. Êtes-vous à votre atelier ?',
    areaConfirmAction: 'Oui, je suis ici',
    areaDeniedTitle: 'Pas de position, pas de souci',
    areaDeniedBody:
      'Rien n’est perdu. Cette étape est facultative et tout le reste de votre vérification fonctionne.',
    areaDeniedSettings:
      'Votre téléphone est réglé pour refuser. Vous pouvez activer la localisation pour SeamFlow dans les réglages, ou simplement passer : c’est facultatif et tout le reste fonctionne.',
    areaFailedTitle: 'Mesure impossible',
    areaFailedBody:
      'Votre téléphone n’a pas trouvé sa position. Se mettre près d’une fenêtre ou sortir un instant suffit en général. Vous pouvez aussi passer cette étape.',
    badgeTitle: 'Atelier vérifié',
    badgeWork: 'SeamFlow a confirmé que le travail de cet atelier est bien le sien.',
    badgeWorkOn: 'SeamFlow a confirmé que le travail de cet atelier est bien le sien, en {date}.',
    badgePhone: 'Son numéro de téléphone est confirmé : on peut la joindre.',
    badgeSince: 'Sur SeamFlow depuis {date}.',
    badgeOrders: '{count} commandes livrées via SeamFlow.',
    badgeOrdersOne: '1 commande livrée via SeamFlow.',
    badgeReplies: 'Répond généralement en {hours} h.',
    badgeFootnote: 'Ce n’est pas une note. Cela veut dire que nous avons vérifié que l’atelier est réel, pas que nous avons jugé son travail.',
  },
  pt: {
    title: 'Verificar a minha oficina',
    statusVerified: 'Verificada',
    statusPending: 'À espera de nós',
    statusDeclined: 'Ainda não',
    statusNone: 'Por começar',
    lede:
      'Dois passos, cerca de cinco minutos. Mostra aos clientes que o trabalho da sua oficina é mesmo seu. Não fazer nada não muda nada: mantém todas as funções e continua a aparecer em Descobrir.',
    ledeVerified:
      'A sua oficina está verificada. Pode enviar de novo se algo tiver mudado.',
    alreadyVerified: 'A SeamFlow confirmou a sua oficina.',
    step1Title: 'Confirme o seu número de telefone',
    step1Body: 'Para que um cliente saiba que há uma pessoa contactável por trás da oficina.',
    step1Action: 'Confirmar o meu número',
    step2Title: 'Mostre-nos uma peça que fez',
    step2Body:
      'Isto abre a sua câmara, e só a câmara. Fotografe aquilo em que está a trabalhar agora, na máquina ou na mesa de corte. Ou volte a fotografar uma peça da sua vitrine noutro ângulo, com um papel onde se veja o nome da oficina e a data de hoje. É essa a verificação: qualquer pessoa guarda uma imagem, só você tira esta.',
    step2Action: 'Abrir a câmara',
    step2Another: 'Tirar outra',
    submitAction: 'Enviar para análise',
    needPhoneFirst: 'Confirme o seu número de telefone para enviar.',
    sentTitle: 'Enviado',
    sentBody: 'Costumamos ver dentro de dois dias. Damos notícias de qualquer forma.',
    pendingBody: 'O seu pedido está connosco. Costumamos ver dentro de dois dias.',
    declinedBody: 'Ainda não conseguimos verificar a sua oficina. {reason}',
    withdrawAction: 'Retirar o meu pedido',
    withdrawTitle: 'Retirar o pedido?',
    withdrawBody: 'Deixamos de o analisar. Pode enviar outro quando quiser.',
    privacyNote:
      'Só a equipa da SeamFlow vê estas fotos, e apagamo-las 90 dias depois de decidirmos. Nunca aparecem na sua vitrine nem em Descobrir.',
    promptTitle: 'Mostre aos clientes que o trabalho é seu',
    promptBody:
      'As oficinas verificadas têm uma marca que os clientes podem tocar para ver o que confirmámos. Dois passos, cerca de cinco minutos. Totalmente opcional.',
    promptAction: 'Começar',
    promptLater: 'Agora não',
    promptDeclinedTitle: 'Falta uma coisa à sua verificação',
    promptDeclinedBody:
      'Ainda não conseguimos verificar a sua oficina. Abra para ver porquê e enviar de novo.',
    promptDeclinedAction: 'Ver porquê',
    extrasTitle: 'Reforce a sua oficina',
    extrasLede:
      'Opcional: nada aqui é preciso para ser verificada. Cada item dá a um cliente mais uma razão para acreditar em si.',
    socialTitle: 'Associar uma conta social',
    socialBody:
      'Damos-lhe um código curto para pôr na sua bio durante um dia. Alguém da nossa equipa procura-o, e é assim que sabemos que a conta é mesmo sua. O seu nome de utilizador passa a aparecer na sua vitrine.',
    socialAction: 'Associar uma conta',
    socialChange: 'Usar outra conta',
    socialPending:
      'À espera de @{handle}. Ponha {code} em qualquer sítio da sua bio e deixe-o até termos visto.',
    socialPickTitle: 'Que conta?',
    socialInstagram: 'Instagram',
    socialFacebook: 'Facebook',
    socialTiktok: 'TikTok',
    socialHandleTitle: 'O seu nome de utilizador',
    socialHandleBody: 'Só o nome, sem o @. Também pode colar o link do seu perfil.',
    socialHandlePlaceholder: 'nomedasuaoficina',
    socialCodeTitle: 'Ponha isto na sua bio',
    socialCodeBody:
      'Adicione {code} em qualquer sítio da sua bio e deixe-o até termos visto. O seu perfil tem de estar público para o conseguirmos ver. Pode retirá-lo assim que for verificada.',
    registrationTitle: 'Número de registo comercial',
    registrationBody:
      'Só se tiver um. A maioria das oficinas não tem, e não ter não conta contra ninguém.',
    registrationLabel: 'Número de registo',
    areaTitle: 'Confirme a sua zona',
    areaBody:
      'Faça uma única leitura enquanto está na sua oficina. Mostra-nos que a sua morada é real. Os clientes só veem o seu bairro, nunca um ponto no mapa.',
    areaAction: 'Confirmar onde estou',
    areaRedo: 'Fazer outra leitura',
    areaDone: 'Feito. Temos uma leitura de onde estava.',
    areaConfirmTitle: 'Uma vez, e só agora',
    areaConfirmBody:
      'A SeamFlow lê a sua localização uma única vez, agora, e nunca mais. Não o seguimos, nada corre em segundo plano, e não haverá nada para desligar depois porque nada continua a correr. Está na sua oficina?',
    areaConfirmAction: 'Sim, estou aqui',
    areaDeniedTitle: 'Sem localização, sem problema',
    areaDeniedBody:
      'Não se perde nada. Este passo é opcional e todo o resto da sua verificação funciona na mesma.',
    areaDeniedSettings:
      'O seu telemóvel está configurado para recusar. Pode ativar a localização para a SeamFlow nas definições, ou simplesmente saltar: é opcional e o resto funciona na mesma.',
    areaFailedTitle: 'Não foi possível obter uma leitura',
    areaFailedBody:
      'O seu telemóvel não conseguiu encontrar onde está. Ficar perto de uma janela ou sair um momento costuma resolver. Também pode saltar este passo.',
    badgeTitle: 'Oficina verificada',
    badgeWork: 'A SeamFlow confirmou que o trabalho desta oficina é mesmo dela.',
    badgeWorkOn: 'A SeamFlow confirmou que o trabalho desta oficina é mesmo dela, em {date}.',
    badgePhone: 'O número de telefone está confirmado, por isso é possível contactá-la.',
    badgeSince: 'Na SeamFlow desde {date}.',
    badgeOrders: '{count} encomendas concluídas através da SeamFlow.',
    badgeOrdersOne: '1 encomenda concluída através da SeamFlow.',
    badgeReplies: 'Costuma responder em {hours}h.',
    badgeFootnote: 'Isto não é uma classificação. Significa que verificámos que a oficina é real, não que avaliámos o trabalho.',
  },
  es: {
    title: 'Verificar mi taller',
    statusVerified: 'Verificado',
    statusPending: 'Esperándonos',
    statusDeclined: 'Todavía no',
    statusNone: 'Sin empezar',
    lede:
      'Dos pasos, unos cinco minutos. Muestra a los clientes que el trabajo de tu taller es tuyo. No hacerlo no cambia nada: conservas todas las funciones y sigues apareciendo en Descubrir.',
    ledeVerified: 'Tu taller está verificado. Puedes enviarlo de nuevo si algo ha cambiado.',
    alreadyVerified: 'SeamFlow ha confirmado tu taller.',
    step1Title: 'Confirma tu número de teléfono',
    step1Body: 'Para que un cliente sepa que hay una persona localizable detrás del taller.',
    step1Action: 'Confirmar mi número',
    step2Title: 'Enséñanos una pieza que hayas hecho',
    step2Body:
      'Esto abre tu cámara, y solo la cámara. Fotografía lo que estés haciendo ahora, en la máquina o en la mesa de corte. O vuelve a fotografiar una pieza de tu escaparate desde otro ángulo, con una nota donde se vea el nombre de tu taller y la fecha de hoy. Esa es toda la comprobación: cualquiera puede guardar una imagen, solo tú puedes hacer esta.',
    step2Action: 'Abrir la cámara',
    step2Another: 'Hacer otra',
    submitAction: 'Enviar para revisión',
    needPhoneFirst: 'Confirma tu número de teléfono para enviarlo.',
    sentTitle: 'Enviado',
    sentBody: 'Solemos mirarlo en dos días. Te avisaremos en cualquier caso.',
    pendingBody: 'Tu solicitud está con nosotros. Solemos mirarla en dos días.',
    declinedBody: 'Todavía no hemos podido verificar tu taller. {reason}',
    withdrawAction: 'Retirar mi solicitud',
    withdrawTitle: '¿Retirar la solicitud?',
    withdrawBody: 'Dejaremos de revisarla. Puedes enviar otra cuando quieras.',
    privacyNote:
      'Solo el equipo de SeamFlow ve estas fotos, y las borramos 90 días después de decidir. Nunca aparecen en tu escaparate ni en Descubrir.',
    promptTitle: 'Muestra a los clientes que el trabajo es tuyo',
    promptBody:
      'Los talleres verificados llevan una marca que los clientes pueden tocar para ver qué comprobamos. Dos pasos, unos cinco minutos. Totalmente opcional.',
    promptAction: 'Empezar',
    promptLater: 'Ahora no',
    promptDeclinedTitle: 'A tu verificación le falta una cosa',
    promptDeclinedBody:
      'Todavía no hemos podido verificar tu taller. Ábrelo para ver por qué y enviarlo otra vez.',
    promptDeclinedAction: 'Ver por qué',
    extrasTitle: 'Refuerza tu taller',
    extrasLede:
      'Opcional: nada de esto hace falta para estar verificado. Cada cosa le da a un cliente una razón más para creerte.',
    socialTitle: 'Vincular una cuenta social',
    socialBody:
      'Te damos un código corto para poner en tu biografía durante un día. Alguien de nuestro equipo lo busca, y así sabemos que la cuenta es tuya de verdad. Tu usuario aparece luego en tu escaparate.',
    socialAction: 'Vincular una cuenta',
    socialChange: 'Usar otra cuenta',
    socialPending:
      'Esperando a @{handle}. Pon {code} en cualquier parte de tu biografía y déjalo hasta que lo hayamos mirado.',
    socialPickTitle: '¿Qué cuenta?',
    socialInstagram: 'Instagram',
    socialFacebook: 'Facebook',
    socialTiktok: 'TikTok',
    socialHandleTitle: 'Tu usuario',
    socialHandleBody: 'Solo el nombre, sin la @. También puedes pegar el enlace de tu perfil.',
    socialHandlePlaceholder: 'nombredetutaller',
    socialCodeTitle: 'Pon esto en tu biografía',
    socialCodeBody:
      'Añade {code} en cualquier parte de tu biografía y déjalo hasta que lo hayamos mirado. Tu perfil tiene que ser público para que podamos verlo. Puedes quitarlo cuando estés verificado.',
    registrationTitle: 'Número de registro mercantil',
    registrationBody:
      'Solo si tienes uno. La mayoría de los talleres no lo tienen, y no tenerlo no perjudica a nadie.',
    registrationLabel: 'Número de registro',
    areaTitle: 'Confirma tu zona',
    areaBody:
      'Haz una sola lectura mientras estás en tu taller. Nos muestra que tu dirección es real. Los clientes solo ven tu barrio, nunca un punto en el mapa.',
    areaAction: 'Confirmar dónde estoy',
    areaRedo: 'Hacer otra lectura',
    areaDone: 'Hecho. Tenemos una lectura de donde estabas.',
    areaConfirmTitle: 'Una vez, y solo ahora',
    areaConfirmBody:
      'SeamFlow lee tu ubicación una sola vez, ahora, y nunca más. No te seguimos, no hay nada corriendo en segundo plano, y no habrá nada que desactivar después porque nada sigue funcionando. ¿Estás en tu taller?',
    areaConfirmAction: 'Sí, estoy aquí',
    areaDeniedTitle: 'Sin ubicación, sin problema',
    areaDeniedBody:
      'No se pierde nada. Este paso es opcional y todo lo demás de tu verificación sigue funcionando.',
    areaDeniedSettings:
      'Tu teléfono está configurado para rechazar. Puedes activar la ubicación para SeamFlow en los ajustes, o simplemente saltarte esto: es opcional y lo demás sigue funcionando.',
    areaFailedTitle: 'No se pudo obtener una lectura',
    areaFailedBody:
      'Tu teléfono no encontró dónde está. Ponerte cerca de una ventana o salir un momento suele bastar. También puedes saltarte este paso.',
    badgeTitle: 'Taller verificado',
    badgeWork: 'SeamFlow ha confirmado que el trabajo de este taller es suyo.',
    badgeWorkOn: 'SeamFlow confirmó que el trabajo de este taller es suyo, en {date}.',
    badgePhone: 'Su número de teléfono está confirmado, así que se le puede contactar.',
    badgeSince: 'En SeamFlow desde {date}.',
    badgeOrders: '{count} pedidos completados a través de SeamFlow.',
    badgeOrdersOne: '1 pedido completado a través de SeamFlow.',
    badgeReplies: 'Suele responder en {hours} h.',
    badgeFootnote: 'Esto no es una valoración. Significa que comprobamos que el taller es real, no que juzgamos su trabajo.',
  },
  sw: {
    title: 'Thibitisha duka langu',
    statusVerified: 'Limethibitishwa',
    statusPending: 'Linatusubiri',
    statusDeclined: 'Bado',
    statusNone: 'Hujaanza',
    lede:
      'Hatua mbili, kama dakika tano. Huwaonyesha wateja kuwa kazi ya duka lako ni yako mwenyewe. Kutofanya hakubadilishi chochote: unabaki na kila kipengele, na bado unaonekana kwenye Gundua.',
    ledeVerified: 'Duka lako limethibitishwa. Unaweza kutuma tena kama kitu kimebadilika.',
    alreadyVerified: 'SeamFlow imethibitisha duka lako.',
    step1Title: 'Thibitisha namba yako ya simu',
    step1Body: 'Ili mteja ajue kuna mtu anayepatikana nyuma ya duka.',
    step1Action: 'Thibitisha namba yangu',
    step2Title: 'Tuonyeshe kipande ulichotengeneza',
    step2Body:
      'Hii inafungua kamera yako, na kamera pekee. Piga picha ya unachofanya sasa, kwenye cherehani au meza ya kukata. Au piga tena kipande kilicho kwenye duka lako kwa mtazamo mwingine, na karatasi inayoonyesha jina la duka lako na tarehe ya leo. Huo ndio ukaguzi wote: mtu yeyote anaweza kuhifadhi picha, wewe pekee unaweza kupiga hii.',
    step2Action: 'Fungua kamera',
    step2Another: 'Piga nyingine',
    submitAction: 'Tuma ikaguliwe',
    needPhoneFirst: 'Thibitisha namba yako ya simu ili kutuma.',
    sentTitle: 'Imetumwa',
    sentBody: 'Kwa kawaida tunaangalia ndani ya siku mbili. Tutakujulisha vyovyote itakavyokuwa.',
    pendingBody: 'Ombi lako liko kwetu. Kwa kawaida tunaangalia ndani ya siku mbili.',
    declinedBody: 'Bado hatujaweza kuthibitisha duka lako. {reason}',
    withdrawAction: 'Ondoa ombi langu',
    withdrawTitle: 'Uondoe ombi?',
    withdrawBody: 'Tutaacha kuliangalia. Unaweza kutuma jipya wakati wowote.',
    privacyNote:
      'Wafanyakazi wa SeamFlow pekee wanaona picha hizi, na tunazifuta siku 90 baada ya kuamua. Hazionekani kamwe kwenye duka lako wala kwenye Gundua.',
    promptTitle: 'Waonyeshe wateja kuwa kazi ni yako',
    promptBody:
      'Maduka yaliyothibitishwa yana alama ambayo wateja wanaweza kugusa kuona tulichokagua. Hatua mbili, kama dakika tano. Ni hiari kabisa.',
    promptAction: 'Anza',
    promptLater: 'Si sasa',
    promptDeclinedTitle: 'Uthibitishaji wako unahitaji kitu kimoja zaidi',
    promptDeclinedBody:
      'Bado hatujaweza kuthibitisha duka lako. Fungua uone sababu na utume tena.',
    promptDeclinedAction: 'Ona sababu',
    extrasTitle: 'Imarisha duka lako',
    extrasLede:
      'Ni hiari: hakuna kitu hapa kinachohitajika ili kuthibitishwa. Kila kimoja humpa mteja sababu moja zaidi ya kukuamini.',
    socialTitle: 'Unganisha akaunti ya mtandao wa kijamii',
    socialBody:
      'Tunakupa msimbo mfupi wa kuweka kwenye wasifu wako kwa siku moja. Mtu wa timu yetu anautafuta, na hivyo ndivyo tunavyojua akaunti ni yako kweli. Jina lako la mtumiaji kisha linaonekana kwenye duka lako.',
    socialAction: 'Unganisha akaunti',
    socialChange: 'Tumia akaunti nyingine',
    socialPending:
      'Tunasubiri @{handle}. Weka {code} mahali popote kwenye wasifu wako na uuache hadi tuangalie.',
    socialPickTitle: 'Akaunti ipi?',
    socialInstagram: 'Instagram',
    socialFacebook: 'Facebook',
    socialTiktok: 'TikTok',
    socialHandleTitle: 'Jina lako la mtumiaji',
    socialHandleBody: 'Jina tu, bila @. Unaweza pia kubandika kiungo cha wasifu wako.',
    socialHandlePlaceholder: 'jinaladukalako',
    socialCodeTitle: 'Weka hii kwenye wasifu wako',
    socialCodeBody:
      'Ongeza {code} mahali popote kwenye wasifu wako na uuache hadi tuangalie. Wasifu wako lazima uwe wa umma ili tuweze kuuona. Unaweza kuuondoa ukishathibitishwa.',
    registrationTitle: 'Namba ya usajili wa biashara',
    registrationBody:
      'Ikiwa tu unayo. Maduka mengi hayana, na kutokuwa nayo hakumdhuru mtu.',
    registrationLabel: 'Namba ya usajili',
    areaTitle: 'Thibitisha eneo lako',
    areaBody:
      'Chukua usomaji mmoja ukiwa umesimama dukani kwako. Hutuonyesha anwani yako ni halisi. Wateja wanaona mtaa wako tu, kamwe si alama kwenye ramani.',
    areaAction: 'Thibitisha nilipo',
    areaRedo: 'Chukua tena',
    areaDone: 'Imekamilika. Tuna usomaji mmoja kutoka ulipokuwa umesimama.',
    areaConfirmTitle: 'Mara moja, na sasa tu',
    areaConfirmBody:
      'SeamFlow inasoma eneo lako mara moja tu, sasa hivi, na kamwe tena. Hatukufuatilii, hakuna kinachoendelea nyuma, na hakutakuwa na kitu cha kuzima baadaye kwa sababu hakuna kinachoendelea. Uko dukani kwako?',
    areaConfirmAction: 'Ndiyo, niko hapa',
    areaDeniedTitle: 'Hakuna eneo, hakuna shida',
    areaDeniedBody:
      'Hakuna kilichopotea. Hatua hii ni ya hiari na kila kitu kingine cha uthibitishaji wako kinaendelea kufanya kazi.',
    areaDeniedSettings:
      'Simu yako imewekwa kukataa. Unaweza kuwasha eneo kwa SeamFlow kwenye mipangilio, au uruke tu: ni hiari na kila kitu kingine kinafanya kazi.',
    areaFailedTitle: 'Haikuweza kupata usomaji',
    areaFailedBody:
      'Simu yako haikuweza kupata ilipo. Kusimama karibu na dirisha au kutoka nje kwa muda mfupi kwa kawaida hurekebisha. Unaweza pia kuruka hatua hii.',
    badgeTitle: 'Duka lililothibitishwa',
    badgeWork: 'SeamFlow imethibitisha kuwa kazi ya duka hili ni yao wenyewe.',
    badgeWorkOn: 'SeamFlow ilithibitisha kuwa kazi ya duka hili ni yao wenyewe, {date}.',
    badgePhone: 'Namba yao ya simu imethibitishwa, hivyo wanaweza kupatikana.',
    badgeSince: 'Kwenye SeamFlow tangu {date}.',
    badgeOrders: 'Kazi {count} zimekamilika kupitia SeamFlow.',
    badgeOrdersOne: 'Kazi 1 imekamilika kupitia SeamFlow.',
    badgeReplies: 'Hujibu kwa kawaida ndani ya saa {hours}.',
    badgeFootnote: 'Hii si alama ya ubora. Inamaanisha tumethibitisha duka ni halisi, si kwamba tumepima kazi yao.',
  },
  ar: {
    title: 'توثيق ورشتي',
    statusVerified: 'موثَّقة',
    statusPending: 'في انتظارنا',
    statusDeclined: 'ليس بعد',
    statusNone: 'لم تبدأ',
    lede:
      'خطوتان، نحو خمس دقائق. تُظهر للعملاء أنّ العمل في ورشتك من صنعك. وتركها لا يغيّر شيئًا: تحتفظ بكل الميزات، وتظل تظهر في «اكتشف».',
    ledeVerified: 'ورشتك موثَّقة. يمكنك الإرسال مرّة أخرى إن تغيّر شيء.',
    alreadyVerified: 'أكّدت SeamFlow ورشتك.',
    step1Title: 'أكِّد رقم هاتفك',
    step1Body: 'حتى يعرف العميل أنّ خلف الورشة شخصًا يمكن الوصول إليه.',
    step1Action: 'تأكيد رقمي',
    step2Title: 'أرِنا قطعة صنعتها',
    step2Body:
      'هذا يفتح الكاميرا، والكاميرا وحدها. صوِّر ما تعمل عليه الآن، على الماكينة أو على طاولة القص. أو أعِد تصوير قطعة من متجرك من زاوية أخرى، مع ورقة يظهر فيها اسم ورشتك وتاريخ اليوم. هذا هو الفحص كلّه: أيّ أحد يستطيع حفظ صورة، وأنت وحدك تستطيع التقاط هذه.',
    step2Action: 'فتح الكاميرا',
    step2Another: 'التقاط أخرى',
    submitAction: 'إرسال للمراجعة',
    needPhoneFirst: 'أكِّد رقم هاتفك لترسل.',
    sentTitle: 'أُرسِل',
    sentBody: 'ننظر عادةً خلال يومين. وسنخبرك بالنتيجة في الحالتين.',
    pendingBody: 'طلبك عندنا. ننظر عادةً خلال يومين.',
    declinedBody: 'لم نتمكّن بعد من توثيق ورشتك. {reason}',
    withdrawAction: 'سحب طلبي',
    withdrawTitle: 'سحب الطلب؟',
    withdrawBody: 'سنتوقّف عن النظر فيه. ويمكنك إرسال طلب جديد متى شئت.',
    privacyNote:
      'لا يرى هذه الصور إلّا فريق SeamFlow، ونحذفها بعد 90 يومًا من قرارنا. ولا تظهر أبدًا في متجرك ولا في «اكتشف».',
    promptTitle: 'أرِ العملاء أنّ العمل عملك',
    promptBody:
      'الورش الموثَّقة تحمل علامة يضغط عليها العميل ليرى ما فحصناه. خطوتان، نحو خمس دقائق. اختياري تمامًا.',
    promptAction: 'ابدأ',
    promptLater: 'ليس الآن',
    promptDeclinedTitle: 'ينقص توثيقك شيء واحد',
    promptDeclinedBody: 'لم نتمكّن بعد من توثيق ورشتك. افتح لترى السبب وترسل مرّة أخرى.',
    promptDeclinedAction: 'اعرف السبب',
    extrasTitle: 'قوِّ ورشتك',
    extrasLede:
      'اختياري: لا شيء هنا لازم للتوثيق. كلّ عنصر يمنح العميل سببًا إضافيًا لتصديقك.',
    socialTitle: 'ربط حساب تواصل اجتماعي',
    socialBody:
      'نعطيك رمزًا قصيرًا تضعه في نبذتك ليوم واحد. يبحث عنه شخص من فريقنا، وبهذا نعرف أنّ الحساب لك فعلًا. ثمّ يظهر معرّفك على متجرك.',
    socialAction: 'ربط حساب',
    socialChange: 'استخدام حساب آخر',
    socialPending:
      'في انتظار @{handle}. ضع {code} في أيّ موضع من نبذتك واتركه حتى نطّلع عليه.',
    socialPickTitle: 'أيّ حساب؟',
    socialInstagram: 'إنستغرام',
    socialFacebook: 'فيسبوك',
    socialTiktok: 'تيك توك',
    socialHandleTitle: 'معرّفك',
    socialHandleBody: 'الاسم فقط، بدون @. ويمكنك لصق رابط ملفك الشخصي بدلًا من ذلك.',
    socialHandlePlaceholder: 'اسم-ورشتك',
    socialCodeTitle: 'ضع هذا في نبذتك',
    socialCodeBody:
      'أضِف {code} في أيّ موضع من نبذتك واتركه حتى نطّلع عليه. يجب أن يكون ملفك عامًّا كي نراه. ويمكنك إزالته بعد التوثيق.',
    registrationTitle: 'رقم السجل التجاري',
    registrationBody:
      'فقط إن كان لديك واحد. معظم الورش ليس لديها، وعدم وجوده لا يُحسب على أحد.',
    registrationLabel: 'رقم السجل',
    areaTitle: 'أكِّد منطقتك',
    areaBody:
      'خُذ قراءة واحدة وأنت واقف في ورشتك. تُظهر لنا أنّ عنوانك حقيقي. ولا يرى العملاء سوى الحيّ، ولا يرون أبدًا نقطة على الخريطة.',
    areaAction: 'تأكيد مكاني',
    areaRedo: 'إعادة القراءة',
    areaDone: 'تمّ. لدينا قراءة واحدة من حيث كنت واقفًا.',
    areaConfirmTitle: 'مرّة واحدة، والآن فقط',
    areaConfirmBody:
      'تقرأ SeamFlow موقعك مرّة واحدة، الآن، ولا تعود أبدًا. نحن لا نتتبّعك، ولا شيء يعمل في الخلفية، ولن يكون هناك ما تُوقفه لاحقًا لأنّ شيئًا لا يستمرّ. هل أنت في ورشتك؟',
    areaConfirmAction: 'نعم، أنا هنا',
    areaDeniedTitle: 'لا موقع، ولا مشكلة',
    areaDeniedBody:
      'لم يُفقد شيء. هذه الخطوة اختيارية وكلّ ما عداها في توثيقك يعمل كما هو.',
    areaDeniedSettings:
      'هاتفك مضبوط على الرفض. يمكنك تفعيل الموقع لـ SeamFlow من الإعدادات، أو تخطّي هذا ببساطة: فهو اختياري وكلّ ما عداه يعمل.',
    areaFailedTitle: 'تعذّرت القراءة',
    areaFailedBody:
      'لم يتمكّن هاتفك من تحديد مكانه. الوقوف قرب نافذة أو الخروج لحظة يحلّ ذلك عادةً. ويمكنك أيضًا تخطّي هذه الخطوة.',
    badgeTitle: 'ورشة موثَّقة',
    badgeWork: 'أكّدت SeamFlow أنّ العمل في هذه الورشة من صنعها.',
    badgeWorkOn: 'أكّدت SeamFlow أنّ العمل في هذه الورشة من صنعها، في {date}.',
    badgePhone: 'رقم هاتفها مؤكَّد، ويمكن الوصول إليها.',
    badgeSince: 'على SeamFlow منذ {date}.',
    badgeOrders: '{count} طلبات أُنجِزت عبر SeamFlow.',
    badgeOrdersOne: 'طلب واحد أُنجِز عبر SeamFlow.',
    badgeReplies: 'يردّ عادةً خلال {hours} ساعة.',
    badgeFootnote: 'هذا ليس تقييمًا. معناه أنّنا تحقّقنا من أنّ الورشة حقيقية، لا أنّنا حكمنا على عملها.',
  },
} as const;
