import type { Metadata } from 'next';
import { CataloguePage, catalogueMetadata } from '../../../../components/views/CataloguePage';

const LANG = 'pt';

interface Props {
  params: Promise<{ slug: string }>;
  /** `?d=<id>` opens one design directly — see CatalogueGrid's URL handling. */
  searchParams: Promise<{ d?: string | string[] }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return catalogueMetadata(slug, LANG);
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const { d } = await searchParams;
  return <CataloguePage slug={slug} lang={LANG} designId={Array.isArray(d) ? d[0] : d} />;
}
