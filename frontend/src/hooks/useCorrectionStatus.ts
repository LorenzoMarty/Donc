"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, type Essay, type JobStatus } from "@/services/api";

const AGENT_LABELS = [
  "Preparando análise...",
  "Agente 1/5 — Verificando tese e estrutura",
  "Agente 2/5 — Analisando gramática (C1)",
  "Agente 3/5 — Identificando repertório (C3)",
  "Agente 4/5 — Avaliando competências ENEM",
  "Agente 5/5 — Calculando nota final",
];

export type CorrectionPhase = "idle" | "queued" | "running" | "completed" | "failed";

export type CorrectionStatus = {
  phase: CorrectionPhase;
  agentIndex: number;
  agentLabel: string;
  progressPercent: number;
  essay: Essay | null;
  error: string | null;
};

export function useCorrectionStatus(essayId: number | null): CorrectionStatus {
  const [phase, setPhase] = useState<CorrectionPhase>("idle");
  const [agentIndex, setAgentIndex] = useState(0);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentIndexRef = useRef(0);

  const stopAll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (agentTickRef.current) clearInterval(agentTickRef.current);
    pollRef.current = null;
    agentTickRef.current = null;
  }, []);

  const startAgentTick = useCallback(() => {
    if (agentTickRef.current) return;
    agentIndexRef.current = 1;
    setAgentIndex(1);
    agentTickRef.current = setInterval(() => {
      agentIndexRef.current = Math.min(agentIndexRef.current + 1, 5);
      setAgentIndex(agentIndexRef.current);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!essayId) return;

    const resetId = window.setTimeout(() => {
      setPhase("queued");
      setAgentIndex(0);
      setEssay(null);
      setError(null);
    }, 0);

    async function poll() {
      try {
        const status = await apiFetch<JobStatus>(`/essays/${essayId}/job`);
        if (status.status === "running" && !agentTickRef.current) {
          setPhase("running");
          startAgentTick();
        } else if (status.status === "queued") {
          setPhase("queued");
        } else if (status.status === "completed") {
          stopAll();
          setPhase("completed");
          setAgentIndex(5);
          setEssay(status.essay ?? null);
        } else if (status.status === "failed") {
          stopAll();
          setPhase("failed");
          setError(status.error ?? "A correção falhou. Tente novamente.");
        }
      } catch {
        // transient error — keep polling
      }
    }

    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      window.clearTimeout(resetId);
      stopAll();
    };
  }, [essayId, startAgentTick, stopAll]);

  const label = phase === "idle" ? "" : AGENT_LABELS[agentIndex] ?? AGENT_LABELS[0];
  const progressPercent = phase === "completed" ? 100 : Math.round((agentIndex / 5) * 100);

  return { phase, agentIndex, agentLabel: label, progressPercent, essay, error };
}
