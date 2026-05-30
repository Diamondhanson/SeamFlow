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
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,23,20,0.04), 0 12px 32px -12px rgba(26,23,20,0.18)',
        pill: '0 1px 2px rgba(26,23,20,0.10)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
