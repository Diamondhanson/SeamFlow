// Root layout for the tokenised share pages (/i/<token>, /o/<token>).
//
// Deliberately English-only: these are opened from a link a tailor sends, they
// carry no language prefix, and they render the linen palette rather than the
// marketing one. If they ever get translated they should move under [lang].
import { RootHtml } from '../../components/RootHtml';
import { siteMetadata } from '../../lib/site-metadata';

export const metadata = siteMetadata;

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="en">{children}</RootHtml>;
}
