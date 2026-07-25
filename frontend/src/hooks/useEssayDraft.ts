"use client";

import { useEffect, useRef, useState } from "react";

import { apiFetch, type Essay, type EssayTheme } from "@/services/api";

export type EssayViewMode = "editor" | "resultado" | "analysis";

const THEME_CHOICES_LIMIT = 4;

export function useEssayDraft() {
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState("Minha redação ENEM");
  const [content, setContent] = useState("");
  const [draftStarted, setDraftStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [mode, setMode] = useState<EssayViewMode>("editor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const saveRequestRef = useRef(0);
  const submittingRef = useRef(false);
  const essayId = essay?.id;
  const essayStatus = essay?.status;
  const selectedThemeId = selectedTheme?.id;
  const wordCount = countWords(content);
  const paragraphCount = countParagraphs(content);

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      try {
        const items = await fetchThemeChoices();
        if (!mounted) return;
        setThemes(items);

        const params = new URLSearchParams(window.location.search);
        const essayId = params.get("essayId");
        if (essayId) {
          const openedEssay = await apiFetch<Essay>(`/essays/${essayId}`);
          if (!mounted) return;
          setEssay(openedEssay);
          setTitle(openedEssay.title);
          setContent(openedEssay.content);
          setSelectedTheme(openedEssay.theme);
          setDraftStarted(true);
          if (params.get("view") === "analise") setMode("analysis");
          else if (openedEssay.status === "corrected") setMode("resultado");
          else setMode("editor");
          return;
        }

        setSelectedTheme(items[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nao foi possivel abrir a redacao.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "editor" || submitting || essayStatus === "corrected") return;

    const id = window.setTimeout(() => {
      const hasContent = content.trim().length > 0;

      if (essayId === undefined) {
        if (!draftStarted || selectedThemeId === undefined || !hasContent) return;
        const requestId = ++saveRequestRef.current;
        setSaving(true);
        apiFetch<Essay>("/essays", {
          method: "POST",
          body: JSON.stringify({ theme_id: selectedThemeId, title, content }),
        })
          .then((saved) => {
            if (requestId === saveRequestRef.current && !submittingRef.current) setEssay(saved);
          })
          .catch((err) => {
            if (requestId === saveRequestRef.current && !submittingRef.current) {
              setError(err instanceof Error ? err.message : "Nao foi possivel salvar o rascunho.");
            }
          })
          .finally(() => {
            if (requestId === saveRequestRef.current && !submittingRef.current) setSaving(false);
          });
        return;
      }

      if (!hasContent) {
        const requestId = ++saveRequestRef.current;
        setSaving(true);
        apiFetch<{ message: string }>(`/essays/${essayId}`, { method: "DELETE" })
          .then(() => {
            if (requestId === saveRequestRef.current && !submittingRef.current) {
              setEssay(null);
              setDraftStarted(true);
            }
          })
          .catch((err) => {
            if (requestId === saveRequestRef.current && !submittingRef.current) {
              setError(err instanceof Error ? err.message : "Nao foi possivel remover o rascunho vazio.");
            }
          })
          .finally(() => {
            if (requestId === saveRequestRef.current && !submittingRef.current) setSaving(false);
          });
        return;
      }

      const requestId = ++saveRequestRef.current;
      setSaving(true);
      apiFetch<Essay>(`/essays/${essayId}/autosave`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      })
        .then((saved) => {
          if (requestId === saveRequestRef.current && !submittingRef.current) setEssay(saved);
        })
        .catch((err) => {
          if (requestId === saveRequestRef.current && !submittingRef.current) {
            setError(err instanceof Error ? err.message : "Nao foi possivel salvar o rascunho.");
          }
        })
        .finally(() => {
          if (requestId === saveRequestRef.current && !submittingRef.current) setSaving(false);
        });
    }, 900);

    return () => window.clearTimeout(id);
  }, [content, draftStarted, essayId, essayStatus, mode, selectedThemeId, submitting, title]);

  function createDraft(theme = selectedTheme) {
    if (!theme) return;
    setError("");
    setSelectedTheme(theme);
    setEssay(null);
    setMode("editor");
    setDraftStarted(true);
    setTitle(`Redacao - ${theme.title.slice(0, 70)}`);
    setContent("");
    replaceEssayUrl();
  }

  async function generateTheme() {
    if (generatingTheme) return;
    setGeneratingTheme(true);
    setError("");
    try {
      const sampledThemes = await fetchThemeChoices();
      setThemes(sampledThemes);
      setSelectedTheme(sampledThemes[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel sortear temas do banco.");
    } finally {
      setGeneratingTheme(false);
    }
  }

  function backToStart() {
    setMode("editor");
    setDraftStarted(false);
    replaceEssayUrl(essay?.id);
  }

  return {
    themes,
    selectedTheme,
    setSelectedTheme,
    essay,
    setEssay,
    title,
    setTitle,
    content,
    setContent,
    draftStarted,
    setDraftStarted,
    saving,
    setSaving,
    submitting,
    setSubmitting,
    generatingTheme,
    mode,
    setMode,
    error,
    setError,
    loading,
    saveRequestRef,
    submittingRef,
    essayId,
    essayStatus,
    selectedThemeId,
    wordCount,
    paragraphCount,
    createDraft,
    generateTheme,
    backToStart,
  };
}

async function fetchThemeChoices() {
  const themes = await apiFetch<EssayTheme[]>("/essays/themes/generate", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return themes.slice(0, THEME_CHOICES_LIMIT);
}

export function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function countParagraphs(value: string) {
  const stripped = value.trim();
  if (!stripped) return 0;
  if (/\n\s*\n/.test(stripped)) return stripped.split(/\n\s*\n+/).filter((paragraph) => paragraph.trim()).length;
  return stripped.split(/\n+/).filter((line) => line.trim()).length;
}

export function replaceEssayUrl(essayId?: number, mode?: EssayViewMode) {
  if (typeof window === "undefined") return;
  if (!essayId) {
    window.history.replaceState(null, "", "/redacao");
    return;
  }

  const params = new URLSearchParams({ essayId: String(essayId) });
  if (mode === "analysis") params.set("view", "analise");
  window.history.replaceState(null, "", `/redacao?${params.toString()}`);
}
