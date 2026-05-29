import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";

import { Providers } from "@/providers/app-providers";
import "./globals.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Donc ENEM | Portugues e Redacao",
    template: "%s | Donc ENEM",
  },
  description: "Plataforma para estudar Portugues e Redacao ENEM com IA, praticas curtas, rotina e progresso real.",
  openGraph: {
    title: "Donc ENEM",
    description: "Estudo de Portugues e Redacao ENEM com IA, rotina e progresso mensuravel.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${merriweather.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
