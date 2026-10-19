"use client";

import { useSyncExternalStore } from "react";

import { LATEST_WHATS_NEW_ID, hasUnreadWhatsNew } from "@/features/whats-new/entries";

const STORAGE_KEY = "donc.whats-new.seen.v1";
const CHANGE_EVENT = "donc:whats-new-seen";

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Registra a novidade mais recente como vista e avisa quem escuta (ex.: o ponto no menu). */
export function markWhatsNewSeen() {
  if (!LATEST_WHATS_NEW_ID) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, LATEST_WHATS_NEW_ID);
  } catch {
    // sem storage (modo privado): o indicador volta a cada visita, sem quebrar nada
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** `true` só no cliente e quando há novidade não vista; no servidor fica `false` (sem ponto no SSR). */
export function useWhatsNewUnread(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasUnreadWhatsNew(readSeen()),
    () => false,
  );
}
