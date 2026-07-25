"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useHighlightsStore, type MotivadorHighlight } from "@/stores/highlights-store";
import { useFreePostItsStore, type FreePostIt } from "@/stores/free-post-its-store";
import { cn } from "@/utils";

/** Paleta de tints do mock (WritingSheet) — ciclada de forma estável por hash do id, não por índice de render. */
const POST_IT_TINTS = ["#fff3b0", "#ffd6a5", "#caffbf", "#bde0fe"];

function tintForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return POST_IT_TINTS[hash % POST_IT_TINTS.length];
}

function rotationForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 17 + id.charCodeAt(i)) >>> 0;
  const sign = hash % 2 ? 1 : -1;
  return sign * (1 + (hash % 200) / 100);
}

const EMPTY_HIGHLIGHTS: MotivadorHighlight[] = [];
const EMPTY_FREE_POST_ITS: FreePostIt[] = [];

/** Fallback pra grifos criados antes do post-it ganhar posição (localStorage antigo sem o campo). */
const DEFAULT_POST_IT_POSITION = { x: 0.65, y: 0.08 };

/** Teto de altura da nota (fração da viewport) — acima disso volta a ter scroll interno normal. */
const NOTE_MAX_HEIGHT_VH = 0.4;

/** Cresce a textarea até o teto sem barra de scroll; acima do teto, scroll interno assume. */
function autoResizeNote(el: HTMLTextAreaElement) {
  const maxHeight = window.innerHeight * NOTE_MAX_HEIGHT_VH;
  el.style.height = "auto";
  const nextHeight = Math.min(el.scrollHeight, maxHeight);
  el.style.height = `${nextHeight}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
}

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
  id,
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
  const tint = tintForId(id);
  const rotation = rotationForId(id);
  const cardRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    if (noteRef.current) autoResizeNote(noteRef.current);
  }, []);

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
        "pointer-events-auto fixed flex w-[180px] min-h-[150px] cursor-grab touch-none select-none flex-col rounded-[3px] p-0 shadow-[0_14px_30px_-10px_rgba(60,50,20,.45),0_2px_5px_rgba(0,0,0,.12)] transition-transform duration-200 ease-out active:cursor-grabbing",
        dragPosition && "scale-105",
      )}
      style={{
        left: `${livePosition.x * 100}%`,
        top: `${livePosition.y * 100}%`,
        backgroundColor: tint,
        transform: `rotate(${rotation}deg)${dragPosition ? " scale(1.05)" : ""}`,
      }}
      title={quote}
    >
      {/* A própria faixa superior (vazia) é o manípulo de arraste — textarea/botão fazem
          stopPropagation no pointerdown (senão digitar ou remover já dispararia o drag). */}
      <div className="flex h-5 items-center justify-end px-0.5">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRemove}
          aria-label="Remover post-it"
          className="grid h-[18px] w-[18px] place-items-center rounded-full bg-black/[0.08] text-black/45 hover:bg-black/[0.14]"
        >
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 px-3 pb-3.5">
        {quote ? <p className="mb-1 line-clamp-2 text-[13px] leading-4 text-[#4a3f1e]">&ldquo;{quote}&rdquo;</p> : null}
        <textarea
          ref={noteRef}
          value={draft}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            setDraft(event.target.value);
            autoResizeNote(event.target);
          }}
          onBlur={() => onChangeNote(draft)}
          placeholder="Sua nota..."
          rows={quote ? 2 : 3}
          className="w-full resize-none border-none bg-transparent text-[14px] leading-[1.4] text-[#4a3f1e] outline-none placeholder:text-[#4a3f1e]/50"
        />
      </div>
    </div>
  );
}
