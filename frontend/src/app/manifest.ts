import type { MetadataRoute } from "next";

// Manifest do PWA: com ele o navegador oferece "Instalar app" / "Adicionar à tela inicial".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Donc | Português e Redação ENEM",
    short_name: "Donc",
    description: "Estude Português e Redação ENEM com correção por IA, treinos curtos e progresso real.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#f6f4ee",
    theme_color: "#2b823b",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
