"use client";

import { useEffect } from "react";
import type { DependencyList } from "react";

export function useDebouncedEffect(effect: () => void, deps: DependencyList, delay: number) {
  useEffect(() => {
    const timeout = window.setTimeout(effect, delay);
    return () => window.clearTimeout(timeout);
  }, deps);
}
