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
//     (minus the status bar), rather than a hardcoded height. Get this wrong
//     and object-fit:cover silently eats the sides — which is exactly what made
//     the tablet's "Start new order" button run edge to edge with no margin.
//     Derive it, don't guess it.
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
}

const SOURCES = {
  phone: { w: 1350, h: 2400, statusBar: 0.05 },
  tablet: { w: 2000, h: 1125, statusBar: 0.042 },
} as const satisfies Record<string, Source>;

/** Screen aspect + the offsets that hide the status bar, derived from the source. */
function screenGeometry({ w, h, statusBar }: Source) {
  return {
    aspectRatio: `${w} / ${h * (1 - statusBar)}`,
    imageHeight: `${(100 / (1 - statusBar)).toFixed(2)}%`,
    imageTop: `-${((statusBar / (1 - statusBar)) * 100).toFixed(2)}%`,
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
          sizes="260px"
          style={{
            position: 'absolute',
            top: g.imageTop,
            left: 0,
            width: '100%',
            height: g.imageHeight,
            objectFit: 'cover',
            objectPosition: 'top center',
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
          sizes="560px"
          style={{
            position: 'absolute',
            top: g.imageTop,
            left: 0,
            width: '100%',
            height: g.imageHeight,
            objectFit: 'cover',
            objectPosition: 'top center',
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
