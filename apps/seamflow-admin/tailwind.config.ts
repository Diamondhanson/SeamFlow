import type { Config } from 'tailwindcss';

// ============================================================================
// Ops dashboard palette — the Atelier "linen" tokens, dressed for dense data.
//
// Mirrors apps/seamflow-web so the two feel like one company, with two
// deliberate departures:
//
//   1. NO ROUNDED CORNERS ANYWHERE. borderRadius is overridden (not extended)
//      so every Tailwind radius utility resolves to 0. A stray `rounded-lg`
//      copied in from elsewhere silently does nothing instead of breaking the
//      look — the constraint is enforced by the config, not by discipline.
//
//   2. Rules over cards. Data this dense reads better separated by hairlines
//      than boxed into panels; boxes add 8 borders per row of information and
//      fight the eye.
// ============================================================================

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    // Override, not extend — every radius utility collapses to a square edge.
    borderRadius: { none: '0', DEFAULT: '0', sm: '0', md: '0', lg: '0', xl: '0', '2xl': '0', full: '0' },
    extend: {
      colors: {
        paper: '#FAF7F2',        // page
        surface: '#F1ECE3',      // subtle fill for table heads / stat blocks
        ink: '#1A1714',          // primary text, warm near-black
        muted: '#5B554F',        // secondary text
        faint: '#8A837B',        // tertiary / captions
        rule: 'rgba(26,23,20,0.14)',   // hairlines
        ruleStrong: 'rgba(26,23,20,0.30)',
        primary: '#5A18C9',      // dyed-thread indigo
        copper: '#B4622D',       // warm accent
        good: '#2F6B4F',
        warn: '#8A6A12',
        bad: '#9B3B2F',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
    },
  },
  plugins: [],
};
export default config;
