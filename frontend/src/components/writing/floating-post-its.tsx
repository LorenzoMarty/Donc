"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

import { useHighlightsStore, type MotivadorHighlight } from "@/stores/highlights-store";

const EMPTY_HIGHLIGHTS: MotivadorHighlight[] = [];

/** Fallback pra grifos criados antes do post-it ganhar posição (localStorage antigo sem o campo). */
const DEFAULT_POST_IT_POSITION = { x: 0.65, y: 0.08 };

/**
 * Post-its dos grifos feitos nos textos motivadores, flutuando livremente sobre a folha de
 * redação (posição em fração 0..1 do container, resiliente a resize). Substitui a listagem fixa
 * que existia no HydraRail — aqui o aluno arrasta cada post-it pra onde quiser na folha.
 */
export function FloatingPostIts({ themeId }: { themeId?: number }) {
  const highlights = useHighlightsStore((state) =>
    themeId != null ? state.highlightsByTheme[themeId] ?? EMPTY_HIGHLIGHTS : EMPTY_HIGHLIGHTS,
  );
  const removeHighlight = useHighlightsStore((state) => state.removeHighlight);
  const setHighlightNote = useHighlightsStore((state) => state.setHighlightNote);
  const setHighlightPosition = useHighlightsStore((state) => state.setHighlightPosition);

  if (themeId == null || highlights.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {highlights.map((highlight) => (
        <FloatingPostIt
          key={highlight.id}
          highlight={highlight}
          onDragEnd={(position) => setHighlightPosition(themeId, highlight.id, position)}
          onChangeNote={(note) => setHighlightNote(themeId, highlight.id, note)}
          onRemove={() => removeHighlight(themeId, highlight.id)}
        />
      ))}
    </div>
  );
}

function FloatingPostIt({
  highlight,
  onDragEnd,
  onChangeNote,
  onRemove,
}: {
  highlight: MotivadorHighlight;
  onDragEnd: (position: { x: number; y: number }) => void;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState(highlight.note ?? "");

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = highlight.position ?? DEFAULT_POST_IT_POSITION;
    draggingRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const parent = cardRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dx = (event.clientX - draggingRef.current.startX) / rect.width;
    const dy = (event.clientY - draggingRef.current.startY) / rect.height;
    const nextX = Math.min(0.88, Math.max(0, draggingRef.current.originX + dx));
    const nextY = Math.min(0.9, Math.max(0, draggingRef.current.originY + dy));
    setDragPosition({ x: nextX, y: nextY });
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = null;
    setDragPosition((current) => {
      if (current) onDragEnd(current);
      return null;
    });
  }

  const position = dragPosition ?? highlight.position ?? DEFAULT_POST_IT_POSITION;

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label={`Post-it: ${highlight.quote}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="pointer-events-auto absolute w-40 -rotate-1 cursor-grab touch-none select-none rounded-sm border border-amber-300/70 bg-amber-200/90 p-2 text-[11px] shadow-elevated transition-transform hover:rotate-0 active:cursor-grabbing dark:bg-amber-300/25"
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      title={highlight.quote}
    >
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onRemove}
        aria-label="Remover post-it"
        className="absolute right-1 top-1 text-amber-900/50 hover:text-amber-900 dark:text-amber-100/50"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
      <p className="mb-1 line-clamp-2 pr-3 leading-3 text-amber-900/80 dark:text-amber-100/80">&ldquo;{highlight.quote}&rdquo;</p>
      <textarea
        value={draft}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onChangeNote(draft)}
        placeholder="Sua nota..."
        rows={2}
        className="w-full resize-none rounded-sm border-none bg-transparent text-[11px] leading-3 text-amber-950 outline-none placeholder:text-amber-900/40 dark:text-amber-50 dark:placeholder:text-amber-100/40"
      />
    </div>
  );
}
