import type { Metadata } from "next";

import { Providers } from "@/components/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lume ENEM | Portugues e Redacao",
  description: "Plataforma premium de Portugues e Redacao focada no ENEM.",
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

