"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiClientError, apiFetch, type Essay, type JobStatus } from "@/services/api";

const AGENT_LABELS = [
  "Preparando análise...",
  "Verificando aderência ao tema",
  "Analisando os critérios do ENEM em paralelo",
  "Calculando nota final",
];
const LAST_PHASE = AGENT_LABELS.length - 1;

export type CorrectionPhase = "idle" | "queued" | "running" | "completed" | "failed";

export type CorrectionStatus = {
  phase: CorrectionPhase;
  agentIndex: number;
  agentLabel: string;
  progressPercent: number;
  essay: Essay | null;
  error: string | null;
  elapsedSeconds: number;
  isSlow: boolean;
};

const SLOW_THRESHOLD_SECONDS = 25;
// Sem isso, job travado/preso em "queued" pra sempre pollava para sempre em silêncio — 10min é
// bem acima do `AI_SYNC_TIMEOUT_SECONDS`/`ai_job_stale_seconds` do backend (45s/180s), então um job
// saudável nunca bate nesse teto; só cobre o caso patológico.
const MAX_POLL_SECONDS = 600;

export function useCorrectionStatus(essayId: number | null): CorrectionStatus {
  const [phase, setPhase] = useState<CorrectionPhase>("idle");
  const [agentIndex, setAgentIndex] = useState(0);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentIndexRef = useRef(0);
  const elapsedRef = useRef(0);
  const stoppedRef = useRef(false);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    if (pollRef.current) clearTimeout(pollRef.current);
    if (agentTickRef.current) clearInterval(agentTickRef.current);
    if (elapsedTickRef.current) clearInterval(elapsedTickRef.current);
    pollRef.current = null;
    agentTickRef.current = null;
    elapsedTickRef.current = null;
  }, []);

  const startAgentTick = useCallback(() => {
    if (agentTickRef.current) return;
    agentIndexRef.current = 1;
    setAgentIndex(1);
    agentTickRef.current = setInterval(() => {
      agentIndexRef.current = Math.min(agentIndexRef.current + 1, LAST_PHASE);
      setAgentIndex(agentIndexRef.current);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!essayId) return;

    stoppedRef.current = false;
    elapsedRef.current = 0;

    const resetId = window.setTimeout(() => {
      setPhase("queued");
      setAgentIndex(0);
      setEssay(null);
      setError(null);
    }, 0);

    // Backoff simples: 2s nos primeiros 30s (janela em que a maioria das correções termina),
    // 5s depois — reduz carga no backend sem atrasar perceptivelmente o caso comum.
    function nextDelay() {
      return elapsedRef.current < 30 ? 2000 : 5000;
    }

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
          setAgentIndex(LAST_PHASE);
          setEssay(status.essay ?? null);
        } else if (status.status === "failed") {
          stopAll();
          setPhase("failed");
          setError(status.error ?? "A correção falhou. Tente novamente.");
        }
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          stopAll();
          setPhase("failed");
          setError("Sessão expirada. Faça login novamente pra ver o resultado.");
          return;
        }
        // outro erro transiente — mantém pollando
      }
      if (!stoppedRef.current) pollRef.current = setTimeout(poll, nextDelay());
    }

    void poll();
    elapsedTickRef.current = setInterval(() => {
      setElapsedSeconds((value) => {
        const next = value + 1;
        elapsedRef.current = next;
        if (next >= MAX_POLL_SECONDS) {
          stopAll();
          setPhase((current) => (current === "completed" ? current : "failed"));
          setError((current) => current ?? "A correção está demorando demais. Tente novamente mais tarde.");
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearTimeout(resetId);
      stopAll();
    };
  }, [essayId, startAgentTick, stopAll]);

  const label = phase === "idle" ? "" : AGENT_LABELS[agentIndex] ?? AGENT_LABELS[0];
  // Nunca mostra 100% por um ticker cosmetico antes da correcao realmente terminar —
  // so a fase "completed" (sinal real do backend) pode fechar a barra.
  const progressPercent = phase === "completed" ? 100 : Math.min(92, Math.round((agentIndex / LAST_PHASE) * 100));
  const isSlow = phase !== "completed" && elapsedSeconds >= SLOW_THRESHOLD_SECONDS;

  return { phase, agentIndex, agentLabel: label, progressPercent, essay, error, elapsedSeconds, isSlow };
}
