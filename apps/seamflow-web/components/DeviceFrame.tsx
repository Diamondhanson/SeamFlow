import Image from 'next/image';

// ============================================================================
// Device frames holding REAL app screenshots.
//
// These replace the hand-drawn CSS mockups. A drawing of an app is never as
// convincing as the app, and it silently goes stale every time the real thing
// changes — the mockups had already drifted from the shipped design.
//
// Three things worth not "tidying" later:
//
//  1. The status bar is cropped OFF in CSS rather than baked out of the file.
//     The source screenshots carry the owner's own notification icons
//     (YouTube, WhatsApp, battery %), which read as sloppy on a marketing page.
//     Doing it here means no re-encoding and no lossy second copy — and it's
//     one number to adjust if a future screenshot has a taller status bar.
//
//  2. Each frame's screen area takes its ASPECT RATIO from the source image
//     (minus the status bar), rather than a hardcoded height. The frame is then
//     the real shape of the real device — nothing is stretched.
//
//     Zoom is a SEPARATE control (`crop`). Don't merge the two: a wrong aspect
//     ratio also zooms, via object-fit:cover eating the sides, and then you have
//     one number doing two jobs and no way to tune either. That is how the
//     tablet's "Start new order" button ended up running edge to edge.
//
//  3. next/image, not <img>. It serves WebP/AVIF at the right size for the
//     viewport; the source PNGs are ~190 KB each and would otherwise be shipped
//     whole to a phone that renders them 260 px wide.
//
// Screens live in public/screens/. Only screens WITHOUT client names may be
// used here — the site is public and those names are not ours to publish.
// ============================================================================

interface Source {
  w: number;
  h: number;
  /** Fraction of the screenshot height taken by the OS status bar. */
  statusBar: number;
  /**
   * Fraction of the screenshot width to slice off EACH side (and, to scale, the
   * bottom). This is a zoom, not a reshape — the frame keeps the device's true
   * proportions either way.
   *
   * Why crop at all: the app screenshots carry the app's own screen padding —
   * 13.3% a side on the phone, 9.2% on the tablet. Shown whole at 260/560 px
   * those margins become a 33 px and 50 px band of empty background inside the
   * bezel, and the mockup reads as a picture in a mat rather than a running
   * device. These values leave roughly 13 px (phone) and 17 px (tablet) —
   * enough that the "Start new order" button clears the bezel, little enough
   * that the screen looks full.
   *
   * Retune by eye if a screenshot with different padding replaces these.
   */
  crop: number;
}

const SOURCES = {
  phone: { w: 1350, h: 2400, statusBar: 0.05, crop: 0.09 },
  tablet: { w: 2000, h: 1125, statusBar: 0.042, crop: 0.065 },
} as const satisfies Record<string, Source>;

/**
 * Screen aspect, plus the image size/offsets that hide the status bar and apply
 * the crop.
 *
 * The aspect ratio is the device's real screen; the image is then oversized by
 * 1/(1-2·crop) and pulled left/up so the wanted region lands in the box. Both
 * axes scale by the same factor, so nothing is squashed.
 */
function screenGeometry({ w, h, statusBar, crop }: Source) {
  const zoom = 1 / (1 - 2 * crop);
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  return {
    aspectRatio: `${w} / ${h * (1 - statusBar)}`,
    imageWidth: pct(zoom),
    imageHeight: pct(zoom / (1 - statusBar)),
    imageLeft: `-${(crop * zoom * 100).toFixed(2)}%`,
    imageTop: `-${((statusBar / (1 - statusBar)) * zoom * 100).toFixed(2)}%`,
  };
}

export function PhoneFrame({
  src = '/screens/app-home-dark.png',
  alt,
  className = '',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const g = screenGeometry(SOURCES.phone);
  return (
    <div
      className={className}
      style={{
        width: 260,
        borderRadius: 34,
        // Halved from 12 — a slimmer bezel reads as a current handset.
        padding: 6,
        background: 'linear-gradient(160deg, #2A2A3D, #16161F)',
        boxShadow: '0 30px 70px -30px rgba(90,70,224,0.55), 0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 29,
          aspectRatio: g.aspectRatio,
          overflow: 'hidden',
          background: '#12121C',
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={SOURCES.phone.w}
          height={SOURCES.phone.h}
          sizes="320px"
          style={{
            position: 'absolute',
            top: g.imageTop,
            left: g.imageLeft,
            width: g.imageWidth,
            height: g.imageHeight,
            // Tailwind preflight sets `img { max-width: 100% }`. The crop makes
            // this image deliberately WIDER than its box, so the clamp would cap
            // the width while leaving the height alone — squashing the screen.
            maxWidth: 'none',
            objectFit: 'fill',
          }}
        />
        {/* Speaker slot, over the screenshot so the device reads as one object. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 74,
            height: 5,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.14)',
          }}
        />
      </div>
    </div>
  );
}

export function TabletFrame({
  src = '/screens/app-home-light.png',
  alt,
  className = '',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const g = screenGeometry(SOURCES.tablet);
  return (
    <div
      className={className}
      style={{
        width: 560,
        borderRadius: 24,
        // Halved from 14.
        padding: 7,
        background: 'linear-gradient(160deg, #2A2A3D, #16161F)',
        boxShadow: '0 40px 90px -40px rgba(90,70,224,0.6), 0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 19,
          aspectRatio: g.aspectRatio,
          overflow: 'hidden',
          background: '#FAF7F2',
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={SOURCES.tablet.w}
          height={SOURCES.tablet.h}
          sizes="640px"
          style={{
            position: 'absolute',
            top: g.imageTop,
            left: g.imageLeft,
            width: g.imageWidth,
            height: g.imageHeight,
            // Tailwind preflight sets `img { max-width: 100% }`. The crop makes
            // this image deliberately WIDER than its box, so the clamp would cap
            // the width while leaving the height alone — squashing the screen.
            maxWidth: 'none',
            objectFit: 'fill',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 5,
            height: 5,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.35)',
          }}
        />
      </div>
    </div>
  );
}
