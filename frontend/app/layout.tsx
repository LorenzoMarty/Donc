import type { Metadata } from "next";

import { Providers } from "@/components/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Donk | Portugues e Redacao ENEM",
  description: "Donk e uma plataforma premium de Portugues e Redacao focada no ENEM.",
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
