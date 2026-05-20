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
};

export default nextConfig;
