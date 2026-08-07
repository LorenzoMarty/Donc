import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Produção/deploy usa standalone; E2E desliga (NEXT_DISABLE_STANDALONE=1) para servir via `next start`.
  output: process.env.NEXT_DISABLE_STANDALONE ? undefined : "standalone",
  // Desliga a geração automática de AGENTS.md/CLAUDE.md do `next dev` (novidade do Next 16.3) —
  // conflita com a convenção de duas camadas de CLAUDE.md já usada no projeto (raiz -> .claude/CLAUDE.md).
  agentRules: false,
  turbopack: {
    root: appDir,
  },
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
