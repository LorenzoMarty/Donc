import { ImageResponse } from "next/og";

// Ícones PNG do PWA (o manifest exige 192 e 512), gerados uma vez no build — nada roda por requisição.
// `maskable-512` deixa a margem de segurança que o Android usa para recortar o ícone.
const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((size) => ({ size }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: key } = await params;
  const icon = ICONS[key];
  if (!icon) return new Response("Tamanho não suportado", { status: 404 });
  const { size, maskable } = icon;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2b823b",
          color: "#ffffff",
          fontSize: Math.round(size * (maskable ? 0.4 : 0.55)),
          fontWeight: 700,
          borderRadius: maskable ? 0 : Math.round(size * 0.2),
        }}
      >
        D
      </div>
    ),
    { width: size, height: size },
  );
}
