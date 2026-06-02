"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Link2,
  MoreHorizontal,
  Share2,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

import { EssayEditor } from "@/components/writing/essay-editor";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTrackEvent } from "@/hooks/use-track-event";
import { useCorrectionStatus } from "@/hooks/useCorrectionStatus";
import { apiFetch, type Essay, type EssaySubmitResponse, type EssayTheme } from "@/services/api";
import type { InlineAnnotation } from "@/types/api";
import { cn } from "@/utils";

type EssayViewMode = "editor" | "analysis";

export default function EssayPage() {
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
  const trackEvent = useTrackEvent();
  const essayId = essay?.id;
  const essayStatus = essay?.status;
  const selectedThemeId = selectedTheme?.id;
  const wordCount = countWords(content);
  const paragraphCount = countParagraphs(content);
  const analysisCorrection = essay?.correction ?? null;
  const analysisTitle = essay?.title ?? title;
  const analysisContent = essay?.content ?? content;
  const analysisTheme = essay?.theme ?? selectedTheme;

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      try {
        const items = await apiFetch<EssayTheme[]>("/essays/themes");
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
          setMode(params.get("view") === "analise" || openedEssay.status === "corrected" ? "analysis" : "editor");
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
      const generatedThemes = await apiFetch<EssayTheme[]>("/essays/themes/generate", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const generatedIds = new Set(generatedThemes.map((theme) => theme.id));
      setThemes((current) => [...generatedThemes, ...current.filter((item) => !generatedIds.has(item.id))]);
      setSelectedTheme(generatedThemes[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel gerar temas com IA.");
    } finally {
      setGeneratingTheme(false);
    }
  }

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

  function backToStart() {
    setMode("editor");
    setDraftStarted(false);
    replaceEssayUrl(essay?.id);
  }

  if (loading) return <LoadingCard />;

  if (submitting && essay) {
    return (
      <CorrectionWaitingScreen
        essayId={essay.id}
        title={title}
        wordCount={wordCount}
        paragraphCount={paragraphCount}
        onCompleted={handleCorrectionCompleted}
        onFailed={handleCorrectionFailed}
      />
    );
  }

  const hasCorrection = Boolean(analysisCorrection);
  const isWriting = mode === "editor" && draftStarted && essay?.status !== "corrected";

  if (mode === "analysis" && essay) {
    return (
      <EssayAnalysisWorkspace
        title={analysisTitle}
        content={analysisContent}
        theme={analysisTheme}
        correction={analysisCorrection}
        error={error}
      />
    );
  }

  if (isWriting) {
    return (
      <EssayEditor
        essay={essay}
        theme={selectedTheme}
        title={title}
        content={content}
        wordCount={wordCount}
        paragraphCount={paragraphCount}
        saving={saving}
        submitting={submitting}
        error={error}
        onBack={backToStart}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onSubmit={submit}
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Laboratorio de redacao"
        title="Escreva e revise por competencia."
        description="Editor compacto para desenvolver sua redacao com clareza e acompanhar estrutura, linhas e paragrafos."
      />

      <div className="grid gap-3 pt-3">
        {!essay ? (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <ThemePicker
              themes={themes}
              selectedTheme={selectedTheme}
              generating={generatingTheme}
              onGenerate={generateTheme}
              onSelect={setSelectedTheme}
            />
            {!draftStarted ? (
              <StartEssayCard selectedTheme={selectedTheme} onCreateDraft={() => createDraft()} />
            ) : null}
          </div>
        ) : hasCorrection ? (
          <CorrectionPanel correction={analysisCorrection} error={error} />
        ) : null}

        {error && !hasCorrection ? (
          <div className="game-tile flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        {essay || draftStarted ? (
          <EssayEditor
            essay={essay}
            theme={selectedTheme}
            title={title}
            content={content}
            wordCount={wordCount}
            paragraphCount={paragraphCount}
            saving={saving}
            submitting={submitting}
            error={error}
            onBack={backToStart}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onSubmit={submit}
          />
        ) : null}
      </div>
    </div>
  );
}

function ThemePicker({
  themes,
  selectedTheme,
  generating,
  onGenerate,
  onSelect,
}: {
  themes: EssayTheme[];
  selectedTheme: EssayTheme | null;
  generating: boolean;
  onGenerate: () => void;
  onSelect: (theme: EssayTheme) => void;
}) {
  return (
    <Surface className="p-4 lg:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Banco de temas</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">Escolha o tema da redacao</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={generating} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {generating ? "Gerando..." : "Gerar 4 temas com IA"}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {themes.map((theme) => (
          <button
            type="button"
            key={theme.id}
            onClick={() => onSelect(theme)}
            className={cn(
              "group grid min-h-[9.5rem] w-full content-start rounded-md border border-border/80 bg-white p-4 text-left transition-all hover:border-primary/35 hover:bg-primary/5",
              selectedTheme?.id === theme.id && "border-primary/45 bg-primary/10 ring-2 ring-primary/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-5">{theme.title}</p>
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-primary transition-colors",
                  selectedTheme?.id === theme.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white",
                )}
              >
                {selectedTheme?.id === theme.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </span>
            </div>
            <p className="text-safe mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{theme.context}</p>
            <div className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Selecionar
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </Surface>
  );
}

function StartEssayCard({
  selectedTheme,
  onCreateDraft,
}: {
  selectedTheme: EssayTheme | null;
  onCreateDraft: () => void;
}) {
  return (
    <Surface className="p-4 lg:p-5 xl:sticky xl:top-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Proxima etapa</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">Comece pelo tema escolhido.</h2>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-border/80 bg-background/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tema selecionado</p>
        <p className="text-safe mt-2 text-sm font-semibold leading-5">{selectedTheme?.title ?? "Selecione um tema no banco ao lado."}</p>
        {selectedTheme ? <p className="text-safe mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{selectedTheme.context}</p> : null}
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        {["Editor limpo para rascunho", "Acompanhamento de estrutura", "Correcao por competencia"].map((item) => (
          <div key={item} className="flex items-center gap-2 font-medium text-muted-foreground">
            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <Button className="mt-6 w-full" onClick={onCreateDraft} disabled={!selectedTheme}>
        Comecar redacao
      </Button>
    </Surface>
  );
}

function CorrectionWaitingScreen({
  essayId,
  title,
  wordCount,
  paragraphCount,
  onCompleted,
  onFailed,
}: {
  essayId: number;
  title: string;
  wordCount: number;
  paragraphCount: number;
  onCompleted: (essay: Essay) => void;
  onFailed: (error: string) => void;
}) {
  const { phase, agentLabel, agentIndex, progressPercent, essay, error } = useCorrectionStatus(essayId);

  useEffect(() => {
    if (phase === "completed" && essay) onCompleted(essay);
  }, [phase, essay, onCompleted]);

  useEffect(() => {
    if (phase === "failed") onFailed(error ?? "A correcao falhou. Tente novamente.");
  }, [phase, error, onFailed]);

  const sparklePositions = [
    { top: "12%", left: "8%", delay: 0 },
    { top: "20%", right: "10%", delay: 0.4 },
    { top: "68%", left: "5%", delay: 0.8 },
    { top: "75%", right: "7%", delay: 1.2 },
  ];

  return (
    <div className="relative grid min-h-[calc(100dvh-10rem)] place-items-center overflow-hidden">
      {sparklePositions.map((pos, i) => (
        <motion.div
          key={i}
          style={{ position: "absolute", ...pos }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ repeat: Infinity, duration: 2.5, delay: pos.delay }}
        >
          <Sparkles className="h-5 w-5 text-primary/50" aria-hidden="true" />
        </motion.div>
      ))}

      <Surface className="w-full max-w-3xl text-center">
        <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary/12 text-primary">
          <Brain className="h-8 w-8" aria-hidden="true" />
          <motion.div
            className="absolute inset-0 rounded-md border-2 border-primary/40"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Correcao em andamento</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">IA analisando sua redacao</h1>
        <motion.p
          key={agentLabel}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mt-3 max-w-lg text-sm font-semibold text-primary"
        >
          {agentLabel}
        </motion.p>

        <div className="mx-auto mt-5 max-w-sm">
          <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Progresso</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground/70">
            {["Tese", "C1", "C3", "ENEM", "Nota"].map((step, i) => (
              <span key={step} className={cn("transition-colors", agentIndex > i ? "text-primary font-semibold" : "")}>
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Titulo</p>
            <p className="text-safe mt-1 text-sm font-semibold">{title}</p>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tamanho</p>
            <p className="mt-1 text-sm font-semibold">{wordCount} palavras</p>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Paragrafos</p>
            <p className="mt-1 text-sm font-semibold">{paragraphCount}</p>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function splitParagraphs(content: string): string[] {
  const stripped = content.trim();
  if (!stripped) return [];
  if (/\n\s*\n/.test(stripped)) return stripped.split(/\n\s*\n+/).filter((p) => p.trim());
  return stripped.split(/\n+/).filter((l) => l.trim());
}

type TextSegment = { text: string; annotation?: InlineAnnotation; index: number };

function buildSegments(paragraph: string, annotations: InlineAnnotation[]): TextSegment[] {
  const ranges: { start: number; end: number; annotation: InlineAnnotation }[] = [];
  for (const annotation of annotations) {
    const idx = paragraph.indexOf(annotation.quote);
    if (idx === -1) continue;
    const end = idx + annotation.quote.length;
    const overlaps = ranges.some((r) => !(end <= r.start || idx >= r.end));
    if (!overlaps) ranges.push({ start: idx, end, annotation });
  }
  ranges.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;
  let segIdx = 0;
  for (const { start, end, annotation } of ranges) {
    if (start > cursor) segments.push({ text: paragraph.slice(cursor, start), index: segIdx++ });
    segments.push({ text: paragraph.slice(start, end), annotation, index: segIdx++ });
    cursor = end;
  }
  if (cursor < paragraph.length) segments.push({ text: paragraph.slice(cursor), index: segIdx++ });
  return segments;
}

function EssayAnalysisWorkspace({
  title,
  content,
  theme,
  correction,
  error,
}: {
  title: string;
  content: string;
  theme: EssayTheme | null;
  correction: Essay["correction"];
  error: string;
}) {
  const [activeAnnotation, setActiveAnnotation] = useState<InlineAnnotation | null>(null);
  const [activeTab, setActiveTab] = useState<"geral" | "estrutura" | "clareza" | "estilo" | "fontes">("geral");
  const annotations = correction?.inline_annotations ?? [];
  const words = countWords(content);

  async function shareEssay() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, text: theme?.title ?? title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  function exportEssay() {
    const lines = [
      title,
      "",
      theme ? `Tema: ${theme.title}` : "",
      correction ? `Nota: ${correction.total_score}` : "",
      "",
      content,
      "",
      "Comentarios da IA",
      ...(correction?.suggestions ?? []).map((item, index) => `${index + 1}. ${item}`),
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(title)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid h-[calc(100dvh-8.75rem)] min-h-[620px] overflow-hidden rounded-md border border-border bg-card md:h-dvh md:rounded-none md:border-0 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
      <div className="flex min-h-0 flex-col">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-safe text-lg font-semibold leading-tight text-foreground lg:text-xl">{title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Salvo
                </span>
                <span>
                  <strong className="text-foreground">{words.toLocaleString("pt-BR")}</strong> palavras
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={shareEssay}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartilhar
            </Button>
            <Button onClick={exportEssay}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </Button>
          </div>
        </header>

        <EssayDocumentPanel
          title={title}
          content={content}
          annotations={annotations}
          activeAnnotation={activeAnnotation}
          onSelectAnnotation={setActiveAnnotation}
        />
        <AIFeedbackPanel
          correction={correction}
          error={error}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeAnnotation={activeAnnotation}
          onSelectAnnotation={setActiveAnnotation}
        />
      </div>
      <AIFeedbackPanel
        correction={correction}
        error={error}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeAnnotation={activeAnnotation}
        onSelectAnnotation={setActiveAnnotation}
      />
    </div>
  );
}

function EssayDocumentPanel({
  title,
  content,
  annotations,
  activeAnnotation,
  onSelectAnnotation,
}: {
  title: string;
  content: string;
  annotations: InlineAnnotation[];
  activeAnnotation: InlineAnnotation | null;
  onSelectAnnotation: (annotation: InlineAnnotation | null) => void;
}) {
  const paragraphs = splitParagraphs(content);
  const annotationsByParagraph = (pIndex: number) => annotations.filter((a) => a.paragraph_index === pIndex);

  return (
    <article className="mobile-scroll min-h-0 flex-1 overflow-y-auto bg-card px-5 py-8 md:px-10 lg:px-12">
      <div className="mx-auto max-w-[860px]">
        <h2 className="text-safe text-4xl font-bold leading-tight tracking-normal text-foreground md:text-5xl [font-family:var(--font-merriweather,Georgia,serif)]">
          {title}
        </h2>

        <div className="mt-8 space-y-8 text-[1.28rem] leading-[2.05] text-foreground [font-family:var(--font-merriweather,Georgia,serif)]">
          {paragraphs.length ? (
            paragraphs.map((paragraph, pIndex) => {
              const paragraphAnnotations = annotationsByParagraph(pIndex);
              const segments = buildSegments(paragraph, paragraphAnnotations);
              return (
                <p key={pIndex} className="relative pr-14">
                  {segments.map((seg) =>
                    seg.annotation ? (
                      <button
                        key={seg.index}
                        type="button"
                        onClick={() =>
                          onSelectAnnotation(activeAnnotation?.quote === seg.annotation?.quote ? null : (seg.annotation ?? null))
                        }
                        className={cn(
                          "rounded-sm px-0.5 text-left underline decoration-2 underline-offset-[6px] transition-colors",
                          annotationTone(seg.annotation).mark,
                          activeAnnotation?.quote === seg.annotation.quote && "ring-2 ring-primary/45",
                        )}
                      >
                        {seg.text}
                      </button>
                    ) : (
                      <span key={seg.index}>{seg.text}</span>
                    ),
                  )}
                  {paragraphAnnotations.map((annotation, index) => (
                    <button
                      key={`${annotation.quote}-${index}`}
                      type="button"
                      onClick={() => onSelectAnnotation(annotation)}
                      className={cn(
                        "absolute right-0 inline-grid h-9 w-9 place-items-center rounded-md border text-sm font-semibold shadow-sm transition-colors",
                        annotationTone(annotation).marker,
                        index > 0 && "translate-y-11",
                      )}
                      aria-label={`Comentario ${annotations.indexOf(annotation) + 1}`}
                    >
                      {annotations.indexOf(annotation) + 1}
                    </button>
                  ))}
                </p>
              );
            })
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>
      </div>
    </article>
  );
}

type AnalysisTab = "geral" | "estrutura" | "clareza" | "estilo" | "fontes";

function AIFeedbackPanel({
  correction,
  error,
  activeTab,
  onTabChange,
  activeAnnotation,
  onSelectAnnotation,
}: {
  correction: Essay["correction"];
  error: string;
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
  activeAnnotation: InlineAnnotation | null;
  onSelectAnnotation: (annotation: InlineAnnotation | null) => void;
}) {
  const annotations = correction?.inline_annotations ?? [];
  const suggestions = buildSuggestionCards(correction, annotations, activeTab);
  const score = correction?.total_score ?? 0;

  return (
    <aside className="mobile-scroll min-h-0 overflow-y-auto border-t border-border bg-background lg:border-l lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <WandSparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">IA Donc</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onSelectAnnotation(null)} aria-label="Limpar comentario selecionado">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-5 flex gap-5 overflow-x-auto text-sm font-semibold text-muted-foreground no-scrollbar">
          {[
            ["geral", "Geral"],
            ["estrutura", "Estrutura"],
            ["clareza", "Clareza"],
            ["estilo", "Estilo"],
            ["fontes", "Fontes"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key as AnalysisTab)}
              className={cn("border-b-2 border-transparent pb-3 transition-colors", activeTab === key && "border-primary text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {correction ? (
          <div className="grid gap-5 border-b border-border pb-5 sm:grid-cols-[7rem_1fr] sm:items-center">
            <ScoreRing score={score} />
            <div>
              <h3 className="text-lg font-semibold">
                {score >= 800 ? "Ótimo trabalho!" : score >= 600 ? "Bom caminho." : "Vamos lapidar."}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{correction.feedback}</p>
            </div>
          </div>
        ) : (
          <div className="game-tile bg-card p-4 text-sm text-muted-foreground">
            Envie a redação para receber comentários por competência.
          </div>
        )}

        {activeAnnotation ? (
          <div className={cn("rounded-md border p-4", annotationTone(activeAnnotation).panel)}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={activeAnnotation.type === "error" ? "destructive" : "success"}>
                {activeAnnotation.type === "error" ? "Ajuste" : "Força"}
              </Badge>
              <Badge variant="outline">{competencyLabel(activeAnnotation.competency)}</Badge>
            </div>
            <p className="text-sm font-semibold italic text-muted-foreground">&quot;{activeAnnotation.quote}&quot;</p>
            <p className="mt-2 text-sm leading-6">{activeAnnotation.comment}</p>
          </div>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Sugestões ({suggestions.length})</h3>
            <button type="button" onClick={() => onSelectAnnotation(null)} className="text-sm font-semibold text-primary">
              Limpar tudo
            </button>
          </div>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.index}-${suggestion.title}`}
                suggestion={suggestion}
                active={activeAnnotation?.quote === suggestion.annotation?.quote}
                onClick={() => onSelectAnnotation(suggestion.annotation ?? null)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Competências
          </div>
          {correction ? (
            <div className="grid gap-2">
              {[
                ["C1", correction.competency_1],
                ["C2", correction.competency_2],
                ["C3", correction.competency_3],
                ["C4", correction.competency_4],
                ["C5", correction.competency_5],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm">
                  <span className="font-semibold">{label}</span>
                  <Progress value={(Number(value) / 200) * 100} className="h-2" />
                  <span className="text-right font-semibold">{value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="game-tile flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ScoreRing({ score }: { score: number }) {
  const display = Math.round(score / 10);
  const degrees = Math.max(0, Math.min(360, (score / 1000) * 360));
  return (
    <div
      className="grid h-24 w-24 place-items-center rounded-full"
      style={{ background: `conic-gradient(hsl(var(--primary)) ${degrees}deg, hsl(var(--muted)) 0deg)` }}
    >
      <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-background text-3xl font-semibold">{display}</div>
    </div>
  );
}

type Suggestion = {
  index: number;
  title: string;
  text: string;
  action: string;
  impact: "Alto impacto" | "Médio impacto" | "Baixo impacto";
  annotation?: InlineAnnotation;
};

function SuggestionCard({ suggestion, active, onClick }: { suggestion: Suggestion; active: boolean; onClick: () => void }) {
  const impactTone =
    suggestion.impact === "Alto impacto"
      ? "bg-primary/12 text-primary"
      : suggestion.impact === "Médio impacto"
        ? "bg-secondary text-foreground"
        : "bg-accent/12 text-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/45",
        active && "border-primary bg-primary/10",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold",
              annotationTone(suggestion.annotation).number,
            )}
          >
            {suggestion.index}
          </span>
          <div>
            <p className="font-semibold">{suggestion.title}</p>
            {suggestion.annotation ? (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{competencyLabel(suggestion.annotation.competency)}</p>
            ) : null}
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", impactTone)}>{suggestion.impact}</span>
      </div>
      <p className="text-sm leading-6 text-foreground/85">{suggestion.text}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-primary">
        <span className="inline-flex items-center gap-2">
          {suggestion.action.includes("citação") ? (
            <Link2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {suggestion.action}
        </span>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
    </button>
  );
}

function buildSuggestionCards(correction: Essay["correction"], annotations: InlineAnnotation[], tab: AnalysisTab): Suggestion[] {
  const base = annotations.map((annotation, index) => ({
    index: index + 1,
    title: suggestionTitle(annotation, index),
    text: annotation.comment,
    action: annotation.competency === "c2" || annotation.competency === "c3" ? "Adicionar citação" : "Reforçar com IA",
    impact: index === 0 ? "Alto impacto" : index === 1 ? "Médio impacto" : "Baixo impacto",
    annotation,
  })) satisfies Suggestion[];

  const filtered = base.filter((item) => {
    if (tab === "geral") return true;
    if (tab === "estrutura") return ["c2", "c3", "c5"].includes(item.annotation.competency);
    if (tab === "clareza") return ["c1", "c4"].includes(item.annotation.competency);
    if (tab === "estilo") return item.annotation.type === "strength" || item.annotation.competency === "c4";
    return ["c2", "c3"].includes(item.annotation.competency);
  });

  if (filtered.length) return filtered;
  return (correction?.suggestions ?? []).slice(0, 4).map((text, index) => ({
    index: index + 1,
    title: ["Força da tese", "Evidência", "Transições", "Conclusão"][index] ?? "Ajuste fino",
    text,
    action: index === 1 ? "Adicionar citação" : "Reforçar com IA",
    impact: index === 0 ? "Alto impacto" : index === 1 ? "Médio impacto" : "Baixo impacto",
  }));
}

function annotationTone(annotation?: InlineAnnotation | null) {
  if (!annotation) {
    return {
      mark: "bg-primary/20 decoration-primary",
      marker: "border-primary bg-primary/10 text-primary-foreground",
      panel: "border-primary/30 bg-primary/10",
      number: "bg-primary/20 text-primary-foreground",
    };
  }
  if (annotation.type === "strength") {
    return {
      mark: "bg-emerald-100 decoration-emerald-500",
      marker: "border-emerald-300 bg-emerald-50 text-emerald-700",
      panel: "border-emerald-200 bg-emerald-50",
      number: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    mark: "bg-primary/25 decoration-primary",
    marker: "border-primary bg-primary/10 text-primary-foreground",
    panel: "border-primary/30 bg-primary/10",
    number: "bg-primary/25 text-primary-foreground",
  };
}

function suggestionTitle(annotation: InlineAnnotation, index: number) {
  const labels: Record<string, string> = {
    c1: "Norma e precisão",
    c2: "Força da tese",
    c3: "Evidência",
    c4: "Transições",
    c5: "Intervenção",
  };
  return labels[annotation.competency] ?? ["Comentário", "Ajuste", "Destaque"][index] ?? "Comentário";
}

function competencyLabel(value: string) {
  const labels: Record<string, string> = {
    c1: "Competência 1 · Norma-padrão",
    c2: "Competência 2 · Tema e gênero",
    c3: "Competência 3 · Argumentação",
    c4: "Competência 4 · Coesão",
    c5: "Competência 5 · Intervenção",
  };
  return labels[value] ?? value.toUpperCase();
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 70) || "redacao"
  );
}

function CorrectionPanel({ correction, error }: { correction: Essay["correction"]; error: string }) {
  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Correção</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">Resumo da IA</h2>
        </div>
        <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      {correction ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-center">
            <ScoreRing score={correction.total_score} />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Nota final</p>
              <p className="mt-1 text-3xl font-semibold">{correction.total_score}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{correction.feedback}</p>
            </div>
          </div>
          <div className="grid gap-2">
            {[
              ["C1", correction.competency_1],
              ["C2", correction.competency_2],
              ["C3", correction.competency_3],
              ["C4", correction.competency_4],
              ["C5", correction.competency_5],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm">
                <span className="font-semibold">{label}</span>
                <Progress value={(Number(value) / 200) * 100} className="h-2" />
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">A nota e os comentários aparecem aqui quando a redação for corrigida.</p>
      )}
      {error ? (
        <div className="game-tile mt-4 flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}
    </Surface>
  );
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function countParagraphs(value: string) {
  const stripped = value.trim();
  if (!stripped) return 0;
  if (/\n\s*\n/.test(stripped)) return stripped.split(/\n\s*\n+/).filter((paragraph) => paragraph.trim()).length;
  return stripped.split(/\n+/).filter((line) => line.trim()).length;
}

function replaceEssayUrl(essayId?: number, mode?: EssayViewMode) {
  if (typeof window === "undefined") return;
  if (!essayId) {
    window.history.replaceState(null, "", "/redacao");
    return;
  }

  const params = new URLSearchParams({ essayId: String(essayId) });
  if (mode === "analysis") params.set("view", "analise");
  window.history.replaceState(null, "", `/redacao?${params.toString()}`);
}
