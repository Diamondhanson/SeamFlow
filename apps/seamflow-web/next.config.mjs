/** @type {import('next').NextConfig} */
const nextConfig = {
  // We import from the monorepo workspace packages — keep transpilation on
  // for everything under @seamflow/*.
  transpilePackages: ['@seamflow/schemas', '@seamflow/api-client'],
  reactStrictMode: true,
  // Photos come back from Supabase Storage as signed URLs on the
  // <project>.supabase.co host. Allow them through next/image when we add it.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // French moved from `?lang=fr` to `/fr/...`. Anything already shared or
  // indexed under the old query form is redirected permanently, so the link
  // equity follows the content instead of dead-ending on an English page.
  async redirects() {
    const localized = ['', '/tailor-assistant', '/support', '/privacy', '/terms'];
    return localized.map((path) => ({
      source: path || '/',
      has: [{ type: 'query', key: 'lang', value: 'fr' }],
      destination: `/fr${path}`,
      permanent: true,
    }));
    // Note: Next always forwards the original query string, so these land on
    // `/fr...?lang=fr` rather than a bare `/fr...`. Harmless — the param is
    // ignored, and the page's own canonical points at the clean URL, so search
    // engines consolidate the two. Stripping it would mean adding middleware
    // that runs on every request of an otherwise fully static site.
  },
};

export default nextConfig;
