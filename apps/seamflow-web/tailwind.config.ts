import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Match the mobile app's accent so the client-facing view feels
        // continuous with what the tailor sees on the device.
        accent: '#7c3aed',
        background: '#fafaf9',
        surface: '#ffffff',
        ink: '#1f2937',
        muted: '#6b7280',
        border: '#e5e7eb',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
