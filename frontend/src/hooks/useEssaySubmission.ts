"use client";

import type { MutableRefObject } from "react";

import { useTrackEvent } from "@/hooks/use-track-event";
import { apiFetch, type Essay, type EssaySubmitResponse } from "@/services/api";

import { replaceEssayUrl, type EssayViewMode } from "./useEssayDraft";

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

  async function submit() {
    if (!essay || submittingRef.current) return;
    setError("");
    if (wordCount < 80) {
      setError("A redacao precisa ter pelo menos 80 palavras para ser enviada para correcao.");
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
      await apiFetch<EssaySubmitResponse>(`/essays/${saved.id}/submit`, { method: "POST" });
      trackEvent({ event_type: "essay_submitted", entity_id: String(saved.id), entity_type: "essay", meta: { word_count: wordCount } });
      // submitting stays true — CorrectionWaitingScreen polls via useCorrectionStatus
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar a correcao.");
      setMode("editor");
      submittingRef.current = false;
      saveRequestRef.current += 1;
      setSubmitting(false);
      setSaving(false);
    }
  }

  function handleCorrectionCompleted(corrected: Essay) {
    setEssay(corrected);
    setTitle(corrected.title);
    setContent(corrected.content);
    setMode("analysis");
    replaceEssayUrl(corrected.id, "analysis");
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
