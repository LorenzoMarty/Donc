"use client";

import { useRef, type MutableRefObject } from "react";

import { useTrackEvent } from "@/hooks/use-track-event";
import { apiFetch, type Essay, type EssaySubmitResponse } from "@/services/api";

import { computeEssayTitle, replaceEssayUrl, type EssayViewMode } from "./useEssayDraft";

type UseEssaySubmissionParams = {
  essay: Essay | null;
  title: string;
  content: string;
  wordCount: number;
  setEssay: (essay: Essay | null) => void;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setMode: (mode: EssayViewMode) => void;
  setError: (error: string) => void;
  setSaving: (saving: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  saveRequestRef: MutableRefObject<number>;
  submittingRef: MutableRefObject<boolean>;
};

export function useEssaySubmission({
  essay,
  title,
  content,
  wordCount,
  setEssay,
  setTitle,
  setContent,
  setMode,
  setError,
  setSaving,
  setSubmitting,
  saveRequestRef,
  submittingRef,
}: UseEssaySubmissionParams) {
  const trackEvent = useTrackEvent();
  // Chave de idempotência estável por tentativa lógica de envio, não por chamada HTTP: se
  // gerássemos uma UUID nova a cada submit(), um retry após falha de rede (o cenário que o
  // backend foi feito pra cobrir, essays.py REQ-9/P2b) mandaria uma chave diferente e nunca
  // reaproveitaria o job já criado do lado do servidor. Só troca quando o essay muda (nova
  // redação) ou depois de uma correção concluída (próximo envio é uma tentativa genuinamente nova).
  const idempotencyKeyRef = useRef<{ essayId: number; key: string } | null>(null);

  function idempotencyKeyFor(essayId: number): string {
    if (idempotencyKeyRef.current?.essayId !== essayId) {
      idempotencyKeyRef.current = { essayId, key: crypto.randomUUID() };
    }
    return idempotencyKeyRef.current.key;
  }

  async function submit() {
    if (!essay || submittingRef.current) return;
    setError("");
    if (wordCount < 80) {
      setError("A redação precisa ter pelo menos 80 palavras para ser enviada para correção.");
      return;
    }

    submittingRef.current = true;
    saveRequestRef.current += 1;
    setSaving(false);
    setSubmitting(true);
    try {
      const saved = await apiFetch<Essay>(`/essays/${essay.id}/autosave`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      setEssay(saved);
      const idempotencyKey = idempotencyKeyFor(saved.id);
      await apiFetch<EssaySubmitResponse>(`/essays/${saved.id}/submit?idempotency_key=${idempotencyKey}`, { method: "POST" });
      trackEvent({ event_type: "essay_submitted", entity_id: String(saved.id), entity_type: "essay", meta: { word_count: wordCount } });
      // submitting stays true — CorrectionWaitingScreen polls via useCorrectionStatus
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a correção.");
      setMode("editor");
      submittingRef.current = false;
      saveRequestRef.current += 1;
      setSubmitting(false);
      setSaving(false);
    }
  }

  function handleCorrectionCompleted(corrected: Essay) {
    setEssay(corrected);
    setTitle(computeEssayTitle(corrected.theme, corrected));
    setContent(corrected.content);
    setMode("resultado");
    replaceEssayUrl(corrected.id);
    idempotencyKeyRef.current = null;
    submittingRef.current = false;
    saveRequestRef.current += 1;
    setSubmitting(false);
    setSaving(false);
  }

  function handleCorrectionFailed(errorMsg: string) {
    setError(errorMsg);
    setMode("editor");
    submittingRef.current = false;
    saveRequestRef.current += 1;
    setSubmitting(false);
    setSaving(false);
  }

  return { submit, handleCorrectionCompleted, handleCorrectionFailed };
}
