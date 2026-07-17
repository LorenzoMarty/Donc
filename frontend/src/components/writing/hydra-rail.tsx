"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { useHighlightsStore, type MotivadorHighlight } from "@/stores/highlights-store";
import { cn } from "@/utils";

const EMPTY_HIGHLIGHTS: MotivadorHighlight[] = [];

/**
 * Rail compacto exibido quando a sidebar de apoio é recolhida: "D" da marca + placeholder da
 * Hydra (mascote ainda não desenhado — ver registro 2026-07-16 no Obsidian) + post-its dos
 * grifos feitos nos textos motivadores do tema atual.
 */
export function HydraRail({ themeId }: { themeId?: number }) {
  const highlights = useHighlightsStore((state) =>
    themeId != null ? state.highlightsByTheme[themeId] ?? EMPTY_HIGHLIGHTS : EMPTY_HIGHLIGHTS,
  );
  const removeHighlight = useHighlightsStore((state) => state.removeHighlight);
  const setHighlightNote = useHighlightsStore((state) => state.setHighlightNote);

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

      <div className="flex w-full flex-col items-center gap-2">
        {themeId == null || highlights.length === 0 ? (
          <p className="px-1 text-center text-[10px] leading-4 text-muted-foreground">
            Grife um trecho nos motivadores para criar um post-it aqui.
          </p>
        ) : (
          highlights.map((highlight) => (
            <PostIt
              key={highlight.id}
              highlight={highlight}
              onChangeNote={(note) => setHighlightNote(themeId, highlight.id, note)}
              onRemove={() => removeHighlight(themeId, highlight.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PostIt({
  highlight,
  onChangeNote,
  onRemove,
}: {
  highlight: MotivadorHighlight;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(highlight.note ?? "");

  return (
    <div
      className="group relative w-full -rotate-1 rounded-sm border border-amber-300/70 bg-amber-200/70 p-2 text-[10px] shadow-sm transition-transform hover:rotate-0 dark:bg-amber-300/20"
      title={highlight.quote}
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover post-it"
        className="absolute right-1 top-1 hidden text-amber-900/50 hover:text-amber-900 group-hover:block dark:text-amber-100/50"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
      <p className={cn("mb-1 line-clamp-2 leading-3 text-amber-900/80 dark:text-amber-100/80")}>&ldquo;{highlight.quote}&rdquo;</p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onChangeNote(draft)}
        placeholder="Sua nota..."
        rows={2}
        className="w-full resize-none rounded-sm border-none bg-transparent text-[10px] leading-3 text-amber-950 outline-none placeholder:text-amber-900/40 dark:text-amber-50 dark:placeholder:text-amber-100/40"
      />
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
