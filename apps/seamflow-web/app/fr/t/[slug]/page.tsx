import type { Metadata } from 'next';
import { CataloguePage, catalogueMetadata } from '../../../../components/views/CataloguePage';

const LANG = 'fr';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return catalogueMetadata(slug, LANG);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <CataloguePage slug={slug} lang={LANG} />;
}
