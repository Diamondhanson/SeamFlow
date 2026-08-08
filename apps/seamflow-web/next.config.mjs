/** @type {import('next').NextConfig} */
const nextConfig = {
  // We import from the monorepo workspace packages — keep transpilation on
  // for everything under @seamflow/*.
  transpilePackages: ['@seamflow/schemas', '@seamflow/api-client'],
  reactStrictMode: true,
  // Photos come back from Supabase Storage as signed URLs on the
  // <project>.supabase.co host. Allow them through next/image when we add it.
  images: {
    // Cap the generated srcset at 1920 (default is 3840).
    //
    // Next returns 400 for any width larger than the source image, so the
    // ceiling has to stay at or below the smallest thing we ship large. 1920
    // covers the full-bleed vision band on a retina laptop, and drops two
    // variants nothing on this site is big enough to serve.
    //
    // If you add a photograph, make sure it is at least 1920 px wide — or lower
    // this number. The screenshots are exempt: they're rendered at 260/560 CSS
    // px, so the browser never picks a large candidate for them.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
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
