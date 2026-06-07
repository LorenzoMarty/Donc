import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produção/deploy usa standalone; E2E desliga (NEXT_DISABLE_STANDALONE=1) para servir via `next start`.
  output: process.env.NEXT_DISABLE_STANDALONE ? undefined : "standalone",
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
