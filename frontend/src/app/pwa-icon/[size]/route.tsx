import { ImageResponse } from "next/og";

const ALLOWED_SIZES = new Set([192, 512]);

/** Ícones PNG do PWA gerados em tempo de requisição (o manifest exige PNG 192 e 512). `?maskable=1`
 * deixa a margem de segurança que o Android usa para recortar o ícone. */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: rawSize } = await params;
  const size = Number(rawSize);
  if (!ALLOWED_SIZES.has(size)) return new Response("Tamanho não suportado", { status: 404 });
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const fontSize = Math.round(size * (maskable ? 0.4 : 0.55));

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
          fontSize,
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
