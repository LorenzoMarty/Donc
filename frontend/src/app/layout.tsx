import type { Metadata } from "next";

import { Providers } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Donk ENEM | Português e Redação",
  description: "Donk ENEM é uma plataforma moderna para estudar Português e Redação com IA, jogos rápidos, conquistas e progresso real.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
