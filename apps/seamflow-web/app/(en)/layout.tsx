// Root layout for the UNPREFIXED English tree.
//
// There are three root layouts, not one — see components/RootHtml.tsx for why.
// Do not add an app/layout.tsx: it would become the root for all three groups
// and silently take `lang`/`dir` back to a hardcoded "en".
import { RootHtml } from '../../components/RootHtml';
import { siteMetadata } from '../../lib/site-metadata';

export const metadata = siteMetadata;

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="en">{children}</RootHtml>;
}
