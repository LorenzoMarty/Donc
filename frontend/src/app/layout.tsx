import type { Metadata } from "next";

import { Providers } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Donk ENEM | Portugues e Redacao",
    template: "%s | Donk ENEM",
  },
  description: "Plataforma para estudar Portugues e Redacao ENEM com IA, praticas curtas, rotina e progresso real.",
  openGraph: {
    title: "Donk ENEM",
    description: "Estudo de Portugues e Redacao ENEM com IA, rotina e progresso mensuravel.",
    type: "website",
  },
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
