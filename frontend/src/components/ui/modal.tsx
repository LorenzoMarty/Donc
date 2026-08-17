"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
};

/** Distância de arrasto (px) pra baixo, na alça, que fecha o sheet. */
const DISMISS_THRESHOLD = 90;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Abaixo de `sm`, o modal vira bottom sheet (nasce da borda inferior, alça arrastável pra
 * fechar) — o mesmo componente vira card centralizado a partir de `sm`. Nunca duas variantes
 * separadas: uma tela que abre modal não deveria ter que decidir isso sozinha.
 */
export function Modal({ open, onClose, title, description, icon: Icon, size = "md", footer, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Trava o scroll de fundo de um jeito que também funciona no Safari iOS — `overflow: hidden`
    // sozinho no body não impede o bounce/scroll do conteúdo atrás do modal nessa plataforma.
    const scrollY = window.scrollY;
    const body = document.body.style;
    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.left = "0";
    body.right = "0";
    body.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      body.position = "";
      body.top = "";
      body.left = "";
      body.right = "";
      body.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open, onClose]);

  // Reseta o arrasto do sheet ao reabrir — ajuste de estado durante o render (não num efeito), o
  // padrão recomendado pra resetar estado derivado de uma prop que mudou.
  const [trackedOpen, setTrackedOpen] = useState(open);
  if (trackedOpen !== open) {
    setTrackedOpen(open);
    if (!open && dragY !== 0) setDragY(0);
  }

  if (!open) return null;

  function handleGrabberPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY };
  }

  function handleGrabberPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setDragY(Math.max(0, event.clientY - dragRef.current.startY));
  }

  function endGrabberDrag() {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (dragY > DISMISS_THRESHOLD) {
      onClose();
      return;
    }
    setDragY(0);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="modal-backdrop-in absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={cn(
          "modal-panel-in relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-card border-t bg-card shadow-[0_24px_60px_rgba(20,30,55,0.18)]",
          "sm:max-h-[90vh] sm:rounded-lg sm:border",
          SIZE_MAP[size],
          className,
        )}
      >
        <div
          className="grid shrink-0 place-items-center touch-none pb-1 pt-2.5 sm:hidden"
          onPointerDown={handleGrabberPointerDown}
          onPointerMove={handleGrabberPointerMove}
          onPointerUp={endGrabberDrag}
          onPointerCancel={endGrabberDrag}
          aria-hidden="true"
        >
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="text-base font-semibold leading-snug">{title}</h2> : null}
              {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="border-t bg-muted/30 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>
  );
}
