import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas logadas e rotas de API não têm nada para indexar.
      disallow: [
        "/api/",
        "/dashboard",
        "/aulas",
        "/games",
        "/redacao",
        "/redacoes",
        "/perfil",
        "/novidades",
        "/suporte",
        "/onboarding",
        "/admin",
        "/assinatura",
        "/login",
        "/cadastro",
        "/recuperar-senha",
        "/redefinir-senha",
        "/verificar-email",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
