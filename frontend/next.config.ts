import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Standalone é só para o deploy self-hosted via Docker — o builder nativo do Vercel já empacota
  // sozinho e quebra se standalone estiver ligado (espera .nft.json que standalone não gera).
  // E2E também desliga (NEXT_DISABLE_STANDALONE=1) para servir via `next start`.
  output: process.env.VERCEL || process.env.NEXT_DISABLE_STANDALONE ? undefined : "standalone",
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
