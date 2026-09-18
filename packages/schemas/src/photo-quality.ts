// ============================================================================
// Photo quality — one issue, one thing to do about it.
//
// The feed is the shop window. A dim, soft photo of a beautiful garment sells
// it badly, and the tailor usually cannot tell on a phone screen in a workshop
// that the shot is two stops under.
//
// HOW THIS IS ALLOWED TO SPEAK
// This is the most delicate copy in the product. The person publishing just
// finished a garment they are proud of, and a machine is about to comment on
// their photograph of it. Four rules, and they are not negotiable:
//
//   1. Say NOTHING when the photo is fine. Silence is the reward, and it is
//      what keeps the one time we do speak worth reading.
//   2. Say ONE thing. A list of faults reads as criticism; a single tip reads
//      as help. We surface the highest-impact issue and drop the rest.
//   3. Never name the defect, name the ACTION. Not "this photo is too dark" —
//      "shot near a window or doorway". One is a verdict, the other is useful.
//   4. Never block. The tailor decides what goes in their own shop window; we
//      only make sure they are deciding with the same information we have.
//
// WHY THE TIPS LIVE HERE AND NOT IN THE MODEL'S REPLY
// Letting the model write the advice would produce fluent English prose in an
// app that ships six languages, and a Swahili-speaking tailor would get a
// polite English lecture about lighting. So the model picks a KEY from this
// list and the app renders the sentence. Same argument as the garment
// taxonomy: the vocabulary is the translation layer.
// ============================================================================

import { z } from 'zod';

export type PhotoIssueLang = 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';

type Labels = Record<PhotoIssueLang, string>;

export const PhotoIssueKeySchema = z.enum([
  /** Under-exposed — the single commonest problem with workshop photos. */
  'dark',
  /** Soft or out of focus. */
  'blurry',
  /** Busy background competing with the garment. */
  'cluttered',
  /** Garment too small in frame. */
  'distant',
  /** Garment cut off at an edge. */
  'cropped',
  /** Blown highlights, usually direct flash or midday sun. */
  'glare',
  /** A screenshot, a collage, or someone else's watermark. */
  'not_original',
  /** Too few pixels to render sharply in the feed grid. Measured, not judged. */
  'low_resolution',
]);
export type PhotoIssueKey = z.infer<typeof PhotoIssueKeySchema>;

/**
 * Ordered by how much fixing each one improves the result. The classifier may
 * report several; the app shows the first that appears in THIS order, because
 * re-shooting a dark photo helps more than tidying a background.
 */
export const PHOTO_ISSUE_PRIORITY: PhotoIssueKey[] = [
  'not_original',
  'low_resolution',
  'blurry',
  'dark',
  'glare',
  'distant',
  'cropped',
  'cluttered',
];

export type PhotoIssueDef = {
  key: PhotoIssueKey;
  /** What to do, in the imperative. Never what is wrong. */
  tip: Labels;
};

export const PHOTO_ISSUES: PhotoIssueDef[] = [
  {
    key: 'dark',
    tip: {
      en: 'Shoot near a window or doorway — daylight makes fabric colour true.',
      fr: 'Photographiez près d’une fenêtre ou d’une porte — la lumière du jour rend la couleur du tissu fidèle.',
      pt: 'Fotografe perto de uma janela ou porta — a luz do dia mostra a cor real do tecido.',
      es: 'Fotografíe cerca de una ventana o puerta: la luz del día muestra el color real de la tela.',
      sw: 'Piga picha karibu na dirisha au mlango — mwanga wa mchana huonyesha rangi halisi ya kitambaa.',
      ar: 'صوّر بالقرب من نافذة أو باب — ضوء النهار يُظهر لون القماش على حقيقته.',
    },
  },
  {
    key: 'blurry',
    tip: {
      en: 'Hold steady and tap the garment on screen to focus before shooting.',
      fr: 'Restez stable et touchez le vêtement à l’écran pour faire la mise au point.',
      pt: 'Segure firme e toque na peça no ecrã para focar antes de disparar.',
      es: 'Mantenga el pulso firme y toque la prenda en la pantalla para enfocar.',
      sw: 'Shika kwa utulivu na gusa vazi kwenye skrini ili kulenga kabla ya kupiga.',
      ar: 'ثبّت يدك والمس القطعة على الشاشة لضبط التركيز قبل التصوير.',
    },
  },
  {
    key: 'cluttered',
    tip: {
      en: 'A plain wall behind the garment keeps the eye on your work.',
      fr: 'Un mur uni derrière le vêtement garde l’attention sur votre travail.',
      pt: 'Uma parede lisa atrás da peça mantém o olhar no seu trabalho.',
      es: 'Una pared lisa detrás de la prenda mantiene la atención en su trabajo.',
      sw: 'Ukuta wa rangi moja nyuma ya vazi huweka macho kwenye kazi yako.',
      ar: 'جدار سادة خلف القطعة يُبقي العين على عملك.',
    },
  },
  {
    key: 'distant',
    tip: {
      en: 'Step closer so the garment fills most of the frame.',
      fr: 'Rapprochez-vous pour que le vêtement remplisse la photo.',
      pt: 'Aproxime-se para a peça ocupar quase toda a fotografia.',
      es: 'Acérquese para que la prenda ocupe casi toda la foto.',
      sw: 'Sogea karibu ili vazi lijaze picha.',
      ar: 'اقترب أكثر حتى تملأ القطعة معظم الصورة.',
    },
  },
  {
    key: 'cropped',
    tip: {
      en: 'Step back a little so the whole garment is in the frame.',
      fr: 'Reculez un peu pour que tout le vêtement tienne dans la photo.',
      pt: 'Afaste-se um pouco para a peça inteira caber na fotografia.',
      es: 'Aléjese un poco para que toda la prenda entre en la foto.',
      sw: 'Rudi nyuma kidogo ili vazi zima liingie kwenye picha.',
      ar: 'ابتعد قليلاً حتى تظهر القطعة كاملة في الصورة.',
    },
  },
  {
    key: 'glare',
    tip: {
      en: 'Turn the flash off and move out of direct sun — shade shows detail.',
      fr: 'Désactivez le flash et sortez du soleil direct — l’ombre révèle les détails.',
      pt: 'Desligue o flash e saia do sol direto — a sombra mostra os detalhes.',
      es: 'Apague el flash y evite el sol directo: la sombra muestra los detalles.',
      sw: 'Zima flash na uepuke jua kali — kivuli huonyesha maelezo.',
      ar: 'أطفئ الفلاش وابتعد عن الشمس المباشرة — الظل يُظهر التفاصيل.',
    },
  },
  {
    key: 'not_original',
    tip: {
      en: 'Use your own photo of the finished piece — screenshots look out of place here.',
      fr: 'Utilisez votre propre photo de la pièce finie — les captures d’écran détonnent ici.',
      pt: 'Use a sua própria fotografia da peça acabada — capturas de ecrã destoam aqui.',
      es: 'Use su propia foto de la prenda terminada: las capturas de pantalla desentonan aquí.',
      sw: 'Tumia picha yako mwenyewe ya kazi iliyokamilika — picha za skrini hazifai hapa.',
      ar: 'استخدم صورتك الخاصة للقطعة المنتهية — لقطات الشاشة تبدو في غير محلها هنا.',
    },
  },
  {
    key: 'low_resolution',
    tip: {
      en: 'This photo is small, so it will look soft in the feed. A fresh shot from your camera will be sharper.',
      fr: 'Cette photo est petite, elle paraîtra floue dans le fil. Une nouvelle prise avec votre appareil sera plus nette.',
      pt: 'Esta fotografia é pequena e ficará desfocada no fluxo. Uma nova com a sua câmara ficará mais nítida.',
      es: 'Esta foto es pequeña y se verá borrosa en el feed. Una nueva con su cámara será más nítida.',
      sw: 'Picha hii ni ndogo, hivyo itaonekana hafifu kwenye mlisho. Picha mpya kutoka kamera yako itakuwa kali zaidi.',
      ar: 'هذه الصورة صغيرة وستبدو غير حادة في الموجز. صورة جديدة من كاميرتك ستكون أوضح.',
    },
  },
];

const BY_KEY = new Map(PHOTO_ISSUES.map((i) => [i.key, i]));

export function photoIssueTip(key: string, lang: PhotoIssueLang = 'en'): string | null {
  return BY_KEY.get(key as PhotoIssueKey)?.tip[lang] ?? null;
}

/**
 * The one issue worth mentioning, or null when the photo is fine.
 *
 * Returning a single key rather than the list is the point — see rule 2 in the
 * header. Callers cannot accidentally render a wall of criticism.
 */
export function topPhotoIssue(issues: string[]): PhotoIssueKey | null {
  for (const key of PHOTO_ISSUE_PRIORITY) {
    if (issues.includes(key)) return key;
  }
  return null;
}

/**
 * Below this, the feed grid renders the image upscaled and soft.
 *
 * Derived, not guessed: a 2-column grid on a ~390pt phone gives a ~173pt cell,
 * which is ~520px on a 3x screen. 800 leaves headroom for 3-column tablets
 * without nagging anyone holding an older phone.
 */
export const MIN_GOOD_SHORT_EDGE = 800;

/**
 * Overall usability, 0-100, as judged by the classifier.
 *
 * Only two bands are acted on, because a third would tempt someone to show a
 * score. Below the threshold the app offers one tip; above it, silence.
 */
export const PHOTO_QUALITY_NUDGE_BELOW = 60;

export const PhotoQualitySchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  issues: z.array(PhotoIssueKeySchema).max(4),
});
export type PhotoQuality = z.infer<typeof PhotoQualitySchema>;
