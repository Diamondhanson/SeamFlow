import Image from 'next/image';
import type { CSSProperties } from 'react';

// ============================================================================
// iPhone and iPad frames holding REAL app screenshots.
//
// The frames are drawn to read as the actual hardware: a metal rim, a black
// glass bezel, the Dynamic Island (iPhone) or front camera (iPad), side buttons,
// a clean 9:41 status bar and the home indicator.
//
// Things worth not "tidying" later:
//
//  1. The status bar is DRAWN, not the screenshot's own. The source screenshots
//     carry the owner's clock and battery level (14:25, 31%), which reads as
//     sloppy on a marketing page. Those rows were painted out of the files in
//     public/screens with the app's background colour; this file draws Apple's
//     9:41 over them. If you add a screenshot, paint its status bar out the same way:
//     iPhone 6.7" (1290×2796) rows 0–150, iPad 12.9" (2048×2732) rows 0–56,
//     plus the iPadOS corner glyph at the bottom right.
//
//  2. Every measurement is a fraction of the device width, taken from Apple's
//     point sizes (iPhone 430×932 pt, iPad 1024×1366 pt). The frames are drawn
//     at a fixed `width` and scaled by the caller, so nothing is responsive in
//     here and nothing reflows.
//
//  3. The screen box has the screenshot's exact aspect ratio, so the image is
//     shown whole — no crop, no stretch.
//
//  4. next/image, not <img>: it serves WebP/AVIF at the rendered size.
//
// Screens live in public/screens/. Only screens WITHOUT client names may be
// used here — the site is public and those names are not ours to publish.
// ============================================================================

const SCREEN = {
  phone: { w: 860, h: 1864 },
  tablet: { w: 1200, h: 1601 },
} as const;

const RIM = 'linear-gradient(145deg, #9C9CA6 0%, #4A4A55 22%, #2B2B33 50%, #55555F 78%, #A4A4AE 100%)';
const BUTTON = 'linear-gradient(90deg, #3A3A43, #8E8E98 50%, #3A3A43)';
const SHADOW_PHONE = '0 40px 80px -30px rgba(90,70,224,0.55), 0 18px 36px -18px rgba(0,0,0,0.55)';
const SHADOW_TABLET = '0 50px 100px -40px rgba(90,70,224,0.6), 0 20px 40px -20px rgba(0,0,0,0.55)';

// Light falling across the glass. Subtle — it should read as glass, not glare.
const GLARE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background:
    'linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 28%, rgba(255,255,255,0) 42%)',
};

function StatusIcons({ size }: { size: number }) {
  // Cellular, Wi-Fi and a full battery, in the proportions iOS draws them.
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: size * 0.32 }}>
      <svg width={size * 1.5} height={size} viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
        <rect x="0" y="8" width="3" height="4" rx="0.8" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
        <rect x="10" y="3" width="3" height="9" rx="0.8" />
        <rect x="15" y="0" width="3" height="12" rx="0.8" />
      </svg>
      <svg width={size * 1.38} height={size} viewBox="0 0 16 11.6" fill="currentColor" aria-hidden="true">
        <path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6 10.2 10.2 0 0 0 .8 3.6L2 4.8a8.5 8.5 0 0 1 6-2.4Z" />
        <path d="M8 5.8c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.8 2l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Z" />
        <path d="M8 9.2c.5 0 .9.2 1.2.5L8 11.6 6.8 9.7c.3-.3.7-.5 1.2-.5Z" />
      </svg>
      <svg width={size * 2.25} height={size} viewBox="0 0 27 12" aria-hidden="true">
        <rect x="0.5" y="0.5" width="23" height="11" rx="3.4" fill="none" stroke="currentColor" strokeOpacity="0.4" />
        <rect x="2" y="2" width="20" height="8" rx="2.1" fill="currentColor" />
        <path d="M25 4v4a2 2 0 0 0 0-4Z" fill="currentColor" fillOpacity="0.45" />
      </svg>
    </span>
  );
}

function SideButton({ side, top, height, thick }: { side: 'left' | 'right'; top: number; height: number; thick: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        [side]: -thick + 0.5,
        top,
        width: thick,
        height,
        borderRadius: side === 'left' ? `${thick}px 0 0 ${thick}px` : `0 ${thick}px ${thick}px 0`,
        background: BUTTON,
      }}
    />
  );
}

interface FrameProps {
  src?: string;
  alt: string;
  /** Overall device width in px, rim included. */
  width?: number;
  className?: string;
  /** Pass for the hero device — it is the largest thing above the fold. */
  priority?: boolean;
}

export function PhoneFrame({ src = '/screens/iphone-home.png', alt, width = 260, className = '', priority }: FrameProps) {
  const rim = Math.max(2, width * 0.011);
  const bezel = width * 0.032;
  const sw = width - 2 * (rim + bezel); // screen width
  const pt = sw / 430; // one iOS point, in px
  const sh = sw * (SCREEN.phone.h / SCREEN.phone.w);
  const screenRadius = 55 * pt;
  const thick = Math.max(2, width * 0.012);
  const outerH = sh + 2 * (rim + bezel);

  return (
    <div className={className} style={{ position: 'relative', width }}>
      {/* Action button + volume on the left, side button on the right. */}
      <SideButton side="left" top={outerH * 0.17} height={outerH * 0.045} thick={thick} />
      <SideButton side="left" top={outerH * 0.25} height={outerH * 0.085} thick={thick} />
      <SideButton side="left" top={outerH * 0.355} height={outerH * 0.085} thick={thick} />
      <SideButton side="right" top={outerH * 0.27} height={outerH * 0.13} thick={thick} />

      <div
        style={{
          padding: rim,
          borderRadius: screenRadius + bezel + rim,
          background: RIM,
          boxShadow: SHADOW_PHONE,
        }}
      >
        <div
          style={{
            padding: bezel,
            borderRadius: screenRadius + bezel,
            background: '#050507',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: sw,
              height: sh,
              borderRadius: screenRadius,
              overflow: 'hidden',
              background: '#10101A',
            }}
          >
            <Image
              src={src}
              alt={alt}
              width={SCREEN.phone.w}
              height={SCREEN.phone.h}
              sizes={`${Math.ceil(sw)}px`}
              priority={priority}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }}
            />

            {/* Status bar: time in the left ear, icons in the right, island between. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                insetInline: 0,
                top: 0,
                height: 54 * pt,
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                color: '#fff',
                direction: 'ltr',
              }}
            >
              <span
                style={{
                  justifySelf: 'center',
                  fontSize: 17 * pt,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  fontFamily: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif',
                  paddingInlineStart: 8 * pt,
                }}
              >
                9:41
              </span>
              <span
                style={{
                  width: 126 * pt,
                  height: 37 * pt,
                  borderRadius: 999,
                  background: '#000',
                  alignSelf: 'start',
                  marginTop: 11 * pt,
                  position: 'relative',
                }}
              >
                {/* Front camera lens, just visible inside the island. */}
                <span
                  style={{
                    position: 'absolute',
                    right: 12 * pt,
                    top: '50%',
                    width: 11 * pt,
                    height: 11 * pt,
                    marginTop: -5.5 * pt,
                    borderRadius: 999,
                    background: 'radial-gradient(circle at 35% 35%, #2B3550 0%, #0C0F18 60%)',
                  }}
                />
              </span>
              <span style={{ justifySelf: 'center', paddingInlineEnd: 4 * pt }}>
                <StatusIcons size={11.5 * pt} />
              </span>
            </div>

            {/* Home indicator */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 8 * pt,
                width: 140 * pt,
                height: 5 * pt,
                marginLeft: -70 * pt,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.85)',
              }}
            />
            <span aria-hidden="true" style={GLARE} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TabletFrame({
  src = '/screens/ipad-storefront.jpg',
  alt,
  width = 400,
  className = '',
  priority,
}: FrameProps) {
  const rim = Math.max(2, width * 0.006);
  const bezel = width * 0.04;
  const sw = width - 2 * (rim + bezel);
  const pt = sw / 1024;
  const sh = sw * (SCREEN.tablet.h / SCREEN.tablet.w);
  const screenRadius = 18 * pt * 2.2;
  const thick = Math.max(2, width * 0.007);
  const outerH = sh + 2 * (rim + bezel);

  return (
    <div className={className} style={{ position: 'relative', width }}>
      {/* Top button on the top edge, volume buttons down the right side. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -thick + 0.5,
          right: width * 0.1,
          width: width * 0.1,
          height: thick,
          borderRadius: `${thick}px ${thick}px 0 0`,
          background: 'linear-gradient(180deg, #3A3A43, #8E8E98 50%, #3A3A43)',
        }}
      />
      <SideButton side="right" top={outerH * 0.08} height={outerH * 0.055} thick={thick} />
      <SideButton side="right" top={outerH * 0.145} height={outerH * 0.055} thick={thick} />

      <div
        style={{
          padding: rim,
          borderRadius: screenRadius + bezel + rim,
          background: RIM,
          boxShadow: SHADOW_TABLET,
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: bezel,
            borderRadius: screenRadius + bezel,
            background: '#050507',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Front camera, centred in the top bezel. */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: bezel / 2,
              left: '50%',
              width: Math.max(4, width * 0.012),
              height: Math.max(4, width * 0.012),
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              background: 'radial-gradient(circle at 35% 35%, #2B3550 0%, #0C0F18 65%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: sw,
              height: sh,
              borderRadius: screenRadius,
              overflow: 'hidden',
              background: '#10101A',
            }}
          >
            <Image
              src={src}
              alt={alt}
              width={SCREEN.tablet.w}
              height={SCREEN.tablet.h}
              sizes={`${Math.ceil(sw)}px`}
              priority={priority}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none' }}
            />

            {/* iPadOS status bar: time and date left, icons right. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                insetInline: 0,
                top: 0,
                height: 24 * pt,
                padding: `0 ${20 * pt}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
                direction: 'ltr',
                fontFamily: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif',
                fontSize: 13 * pt,
                fontWeight: 600,
              }}
            >
              <span>
                9:41 <span style={{ fontWeight: 500 }}>Tue 9 Jan</span>
              </span>
              <StatusIcons size={10 * pt} />
            </div>

            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 8 * pt,
                width: 300 * pt,
                height: 5 * pt,
                marginLeft: -150 * pt,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.85)',
              }}
            />
            <span aria-hidden="true" style={GLARE} />
          </div>
        </div>
      </div>
    </div>
  );
}
