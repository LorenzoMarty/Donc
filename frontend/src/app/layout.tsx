import type { Metadata } from "next";

import { Providers } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Donk ENEM | Português e Redação",
  description: "Donk ENEM e uma plataforma moderna para estudar Portugues e Redacao com IA, praticas curtas, rotina e progresso real.",
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
