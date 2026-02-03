import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/v1/playground/:slug*',
        destination: '/playground/:slug*', 
        permanent: true,
      },
      {
        source: '/v1/experimental/:slug*',
        destination: '/projects/:slug*',
        permanent: true,
      },
    ];
  },

  skipTrailingSlashRedirect: true,
};

export default nextConfig;
