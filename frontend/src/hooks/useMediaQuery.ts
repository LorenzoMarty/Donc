"use client";

import { useEffect, useState } from "react";

/**
 * Fonte única de verdade pra decisões de comportamento (não só visual) por tipo de input —
 * ver `useCoarsePointer`/`useHoverCapable` abaixo. Nunca decidir isso ad-hoc por largura de tela:
 * um tablet grande é "coarse" mesmo com viewport de desktop, e um notebook 2-em-1 pode alternar
 * entre os dois em tempo real.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = () => (typeof window === "undefined" ? false : window.matchMedia(query).matches);
  const [matches, setMatches] = useState(getMatches);

  // Se `query` mudar entre renders, resincroniza no próprio render (padrão React pra "ajustar
  // estado derivado de uma prop que mudou") em vez de esperar o próximo evento de mudança do SO.
  const [trackedQuery, setTrackedQuery] = useState(query);
  if (trackedQuery !== query) {
    setTrackedQuery(query);
    setMatches(getMatches());
  }

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Ponteiro "grosso" (dedo, a maioria das canetas) — sem precisão de mouse. */
export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}

/** Dispositivo com hover real disponível (mouse/trackpad) — não confundir com "não é touch". */
export function useHoverCapable(): boolean {
  return useMediaQuery("(hover: hover)");
}
