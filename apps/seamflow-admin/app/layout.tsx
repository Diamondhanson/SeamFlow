import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { Nav } from '../components/nav';
import { getIssueCount } from '../lib/queries/health';
import './globals.css';

// Same type system as the marketing site and the app: Fraunces for headings
// (the craft signal), Inter for UI, JetBrains Mono for figures.
const fraunces = Fraunces({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'SeamFlow Ops',
  description: 'Internal platform dashboard. Local only.',
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // One cheap scalar so the sidebar can carry a badge. If the database is
  // unreachable the shell still renders — a dashboard that shows a stack trace
  // instead of navigation is harder to recover from than one showing a zero.
  let issues = 0;
  try {
    issues = await getIssueCount();
  } catch {
    issues = 0;
  }

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-rule bg-paper lg:block">
            <Nav issues={issues} />
          </aside>
          <div className="min-w-0 flex-1">
            {/* Narrow screens get the same nav, stacked above the content,
                rather than a hamburger — this is one person's laptop tool and a
                drawer would be more machinery than the problem deserves. */}
            <div className="border-b border-rule lg:hidden">
              <Nav issues={issues} />
            </div>
            <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
