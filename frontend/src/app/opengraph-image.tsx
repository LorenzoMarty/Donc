import { ImageResponse } from "next/og";

export const alt = "Donc | Português e Redação ENEM com correção por IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0f3d2e",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: 4, color: "#9be3bf" }}>DONC</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, marginTop: 24 }}>Português e Redação ENEM com correção por IA</div>
        <div style={{ fontSize: 34, marginTop: 32, color: "#cfe9dc" }}>Treino curto, feedback por competência, progresso real.</div>
      </div>
    ),
    size,
  );
}
