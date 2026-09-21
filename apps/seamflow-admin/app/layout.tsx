import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Same type system as the marketing site and the app: Fraunces for headings
// (the craft signal), Inter for UI, JetBrains Mono for figures.
const fraunces = Fraunces({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'SeamFlow Ops',
  description: 'Internal platform dashboard. Staff only.',
  robots: { index: false, follow: false },
};

/**
 * The bare document. The signed-in shell (sidebar, data) lives in
 * app/(ops)/layout.tsx so that /login renders without touching the database.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
