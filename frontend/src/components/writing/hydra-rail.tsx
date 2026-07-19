"use client";

/**
 * Rail compacto exibido quando a sidebar de apoio é recolhida: "D" da marca + placeholder da
 * Hydra (mascote ainda não desenhado — ver registro 2026-07-16 no Obsidian). Os post-its dos
 * grifos nos motivadores vivem flutuando sobre a folha de redação (`FloatingPostIts`), não aqui.
 */
export function HydraRail() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary text-sm font-bold text-primary-foreground"
        title="Donc"
        aria-hidden="true"
      >
        D
      </div>

      <HydraPlaceholder />
    </div>
  );
}

/** Placeholder do mascote — sete "brotos" ao redor de um corpo central, até a arte final existir. */
function HydraPlaceholder() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0 text-primary">
      <circle cx="20" cy="24" r="10" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.5" />
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
        const cx = 20 + Math.cos(angle) * 12;
        const cy = 16 + Math.sin(angle) * 10;
        return <circle key={index} cx={cx} cy={cy} r="3.4" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.2" />;
      })}
      <circle cx="20" cy="10" r="4.2" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
