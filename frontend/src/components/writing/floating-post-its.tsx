"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal, X } from "lucide-react";

import { useHighlightsStore, type MotivadorHighlight } from "@/stores/highlights-store";
import { useFreePostItsStore, type FreePostIt } from "@/stores/free-post-its-store";
import { cn } from "@/utils";

const EMPTY_HIGHLIGHTS: MotivadorHighlight[] = [];
const EMPTY_FREE_POST_ITS: FreePostIt[] = [];

/** Fallback pra grifos criados antes do post-it ganhar posição (localStorage antigo sem o campo). */
const DEFAULT_POST_IT_POSITION = { x: 0.65, y: 0.08 };

const noopSubscribe = () => () => {};
/** Portal só existe no browser (document.body) — useSyncExternalStore evita mismatch de hidratação sem setState em efeito. */
function useIsBrowser() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Camada de post-its sobre a tela inteira (portal pro body, não preso à folha de redação):
 * post-its de grifo de texto motivador (`useHighlightsStore`) e post-its livres criados pelo dock
 * (`useFreePostItsStore`), ambos renderizados como o mesmo cartão flutuante e arrastáveis por
 * qualquer ponto da viewport.
 */
export function FloatingPostIts({ themeId }: { themeId?: number }) {
  const mounted = useIsBrowser();

  const highlights = useHighlightsStore((state) =>
    themeId != null ? state.highlightsByTheme[themeId] ?? EMPTY_HIGHLIGHTS : EMPTY_HIGHLIGHTS,
  );
  const removeHighlight = useHighlightsStore((state) => state.removeHighlight);
  const setHighlightNote = useHighlightsStore((state) => state.setHighlightNote);
  const setHighlightPosition = useHighlightsStore((state) => state.setHighlightPosition);

  const freePostIts = useFreePostItsStore(
    (state) => state.postItsByTheme[themeId == null ? "untitled" : String(themeId)] ?? EMPTY_FREE_POST_ITS,
  );
  const removeFreePostIt = useFreePostItsStore((state) => state.removePostIt);
  const setFreePostItNote = useFreePostItsStore((state) => state.setPostItNote);
  const setFreePostItPosition = useFreePostItsStore((state) => state.setPostItPosition);

  if (!mounted || (highlights.length === 0 && freePostIts.length === 0)) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {highlights.map((highlight) => (
        <PostItCard
          key={highlight.id}
          id={highlight.id}
          quote={highlight.quote}
          note={highlight.note ?? ""}
          position={highlight.position ?? DEFAULT_POST_IT_POSITION}
          onDragEnd={(position) => setHighlightPosition(themeId!, highlight.id, position)}
          onChangeNote={(note) => setHighlightNote(themeId!, highlight.id, note)}
          onRemove={() => removeHighlight(themeId!, highlight.id)}
        />
      ))}
      {freePostIts.map((postIt) => (
        <PostItCard
          key={postIt.id}
          id={postIt.id}
          note={postIt.note}
          position={postIt.position}
          onDragEnd={(position) => setFreePostItPosition(themeId, postIt.id, position)}
          onChangeNote={(note) => setFreePostItNote(themeId, postIt.id, note)}
          onRemove={() => removeFreePostIt(themeId, postIt.id)}
        />
      ))}
    </div>,
    document.body,
  );
}

function PostItCard({
  quote,
  note,
  position,
  onDragEnd,
  onChangeNote,
  onRemove,
}: {
  id: string;
  quote?: string;
  note: string;
  position: { x: number; y: number };
  onDragEnd: (position: { x: number; y: number }) => void;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState(note);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const dx = (event.clientX - draggingRef.current.startX) / window.innerWidth;
    const dy = (event.clientY - draggingRef.current.startY) / window.innerHeight;
    const nextX = Math.min(0.94, Math.max(0, draggingRef.current.originX + dx));
    const nextY = Math.min(0.95, Math.max(0, draggingRef.current.originY + dy));
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

  const livePosition = dragPosition ?? position;

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label={quote ? `Post-it: ${quote}` : "Post-it"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "pointer-events-auto fixed w-40 -rotate-1 cursor-grab touch-none select-none rounded-sm border border-amber-300/70 bg-amber-200/90 p-2 text-[11px] shadow-elevated transition-transform duration-200 ease-out hover:rotate-0 active:cursor-grabbing dark:bg-amber-300/25",
        dragPosition ? "scale-105 shadow-2xl" : "scale-100",
      )}
      style={{ left: `${livePosition.x * 100}%`, top: `${livePosition.y * 100}%` }}
      title={quote}
    >
      {/* Manípulo dedicado: o textarea/botão fazem stopPropagation no pointerdown (senão digitar
          ou remover já dispararia o drag), então post-its sem citação — só nota livre — ficavam
          sem nenhuma área "vazia" pra segurar e arrastar. */}
      <div className="mb-1 flex items-center justify-center text-amber-900/30 dark:text-amber-100/30">
        <GripHorizontal className="h-3 w-3" aria-hidden="true" />
      </div>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onRemove}
        aria-label="Remover post-it"
        className="absolute right-1 top-1 text-amber-900/50 hover:text-amber-900 dark:text-amber-100/50"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
      {quote ? <p className="mb-1 line-clamp-2 pr-3 leading-3 text-amber-900/80 dark:text-amber-100/80">&ldquo;{quote}&rdquo;</p> : null}
      <textarea
        value={draft}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onChangeNote(draft)}
        placeholder="Sua nota..."
        rows={quote ? 2 : 3}
        className="w-full resize-none rounded-sm border-none bg-transparent text-[11px] leading-3 text-amber-950 outline-none placeholder:text-amber-900/40 dark:text-amber-50 dark:placeholder:text-amber-100/40"
      />
    </div>
  );
}
