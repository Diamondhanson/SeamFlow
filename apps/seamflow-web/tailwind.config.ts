import type { Config } from 'tailwindcss';

// ============================================================================
// Atelier "linen" — the warm, light, customer-facing palette. Mirrors
// packages/ui/src/tokens/colors.ts (linenSemantic) so the share page feels
// like the same brand the tailor uses, just dressed for daylight.
//   - No pure black / white. Ink is a warm near-black; paper is cream.
//   - Primary is dyed-thread indigo; copper is the warm accent pop.
// ============================================================================

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        background: '#FAF7F2', // linen.base
        surface: '#F1ECE3', // linen.paper
        surfaceElevated: '#E9E2D3', // linen.surface2

        // Text
        ink: '#1A1714', // primary text — warm near-black
        muted: '#5B554F', // secondary text
        onPrimary: '#FAF7F2',

        // Lines
        border: '#D9C6AE', // clay
        hairline: 'rgba(26,23,20,0.08)',

        // Primary + accents
        primary: '#2E3A8C', // indigo (dyed thread)
        primarySoft: '#5764B8',
        accent: '#C97B5C', // copper
        success: '#8FA68E', // sage
        warning: '#D89F4A', // amber
        danger: '#B4564B', // rose

        // Status badges
        statusRegistered: '#5B554F',
        statusInProgress: '#2E3A8C',
        statusTesting: '#D89F4A',
        statusOnPause: '#B4564B',
        statusDelivered: '#8FA68E',

        // ── Marketing site palette (roadmap 3.12) ──────────────────────────
        // Same Atelier DNA, dialed poppier/more saturated. Kept separate from
        // the tokens above so the /o and /i share pages stay in the calm linen
        // palette while the landing + legal pages get the brighter treatment.
        brand: {
          bg: '#FBF8F3', // warm cream
          surface: '#F4EEE3', // warm off-white cards
          ink: '#1A1714', // warm near-black text
          muted: '#5B554F', // secondary text
          hairline: 'rgba(26,23,20,0.08)',
          border: 'rgba(26,23,20,0.12)',
          primary: '#5A46E0', // poppier indigo-violet
          primaryDeep: '#4634C4',
          lavender: '#A89CFF', // gradient stop / soft primary
          accent: '#F0875A', // bright coral-peach
          accentSoft: '#F8B79A',
          success: '#2FBF95', // brighter mint
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,23,20,0.04), 0 12px 32px -12px rgba(26,23,20,0.18)',
        pill: '0 1px 2px rgba(26,23,20,0.10)',
        soft: '0 2px 6px rgba(26,23,20,0.05), 0 20px 48px -20px rgba(90,70,224,0.28)',
        glow: '0 12px 40px -12px rgba(90,70,224,0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
