"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/http-client";

type TrackPayload = {
  event_type: string;
  entity_id?: string;
  entity_type?: string;
  duration_ms?: number;
  meta?: Record<string, unknown>;
};

export function useTrackEvent() {
  return useCallback((payload: TrackPayload) => {
    apiFetch("/admin/events", {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }, []);
}
