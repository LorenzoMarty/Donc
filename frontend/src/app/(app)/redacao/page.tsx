"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertCircle, Brain, ChevronRight, Cpu, Leaf, Sparkles, Users, type LucideIcon } from "lucide-react";

import { EssayEditor } from "@/components/writing/essay-editor";
import { EssayAnalysisWorkspace } from "@/components/writing/essay-analysis";
import { EssayResultado } from "@/components/writing/essay-resultado";
import { FolhinhaMascot } from "@/components/shared/folhinha-mascot";
import { LoadingCard } from "@/components/shared/loading-card";
import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCorrectionStatus } from "@/hooks/useCorrectionStatus";
import { useEssayDraft, replaceEssayUrl } from "@/hooks/useEssayDraft";
import { useEssaySubmission } from "@/hooks/useEssaySubmission";
import { type Essay, type EssayTheme } from "@/services/api";
import { cn } from "@/utils";

export default function EssayPage() {
  const draft = useEssayDraft();
  const {
    themes,
    selectedTheme,
    essay,
    title,
    content,
    setContent,
    draftStarted,
    saving,
    submitting,
    setSubmitting,
    mode,
    error,
    loading,
    saveRequestRef,
    submittingRef,
    wordCount,
    paragraphCount,
    createDraft,
    backToStart,
  } = draft;

  const { submit, handleCorrectionCompleted, handleCorrectionFailed } = useEssaySubmission({
    essay,
    title,
    content,
    wordCount,
    setEssay: draft.setEssay,
    setTitle: draft.setTitle,
    setContent: draft.setContent,
    setMode: draft.setMode,
    setError: draft.setError,
    setSaving: draft.setSaving,
    setSubmitting,
    saveRequestRef,
    submittingRef,
  });

  const analysisCorrection = essay?.correction ?? null;
  const analysisTitle = essay?.title ?? title;
  const analysisContent = essay?.content ?? content;
  const analysisTheme = essay?.theme ?? selectedTheme;

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

  const isWriting = mode === "editor" && draftStarted && essay?.status !== "corrected";

  if (mode === "resultado" && essay) {
    return (
      <EssayResultado
        essay={essay}
        onViewAnalysis={() => {
          draft.setMode("analysis");
          replaceEssayUrl(essay.id, "analysis");
        }}
        onRewrite={() => createDraft(essay.theme)}
      />
    );
  }

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
        saving={saving}
        submitting={submitting}
        error={error}
        onBack={backToStart}
        onContentChange={setContent}
        onSubmit={submit}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <FolhinhaMascot mood="think" size={80} message="Escolhe um tema que te dê vontade de argumentar." side="right" />
        <div className="ml-1.5">
          <p className="text-sm text-muted-foreground">Nova redação</p>
          <h1 className="page-title font-display mt-0.5 font-medium">Escolha um tema para começar</h1>
        </div>
      </div>

      <div className="grid gap-3 pt-3">
        {!essay ? <ThemePicker themes={themes} onPick={(theme) => createDraft(theme)} /> : null}

        {error ? (
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
            saving={saving}
            submitting={submitting}
            error={error}
            onBack={backToStart}
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
  onPick,
}: {
  themes: EssayTheme[];
  onPick: (theme: EssayTheme) => void;
}) {
  const [filter, setFilter] = useState<ThemeCategory | "todos">("todos");
  const uniqueThemes = themes.filter((theme, index) => themes.findIndex((other) => other.title === theme.title) === index);
  const weekly = uniqueThemes[0];
  const rest = uniqueThemes.slice(1);
  const shown = filter === "todos" ? rest : rest.filter((theme) => classifyTheme(theme) === filter);

  return (
    <div>
      {weekly ? (
        <div className="comfortable-card mb-5 flex flex-col gap-5 rounded-card bg-[hsl(var(--accent-900))] text-white shadow-soft sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--accent-300))]">Tema da semana</p>
            <p className="font-display mt-1.5 text-[1.35rem] font-medium leading-tight sm:text-2xl">{weekly.title}</p>
            <p className="mt-1 text-sm text-white/70">{weekly.source}</p>
          </div>
          <button
            type="button"
            onClick={() => onPick(weekly)}
            className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-control bg-white px-5 py-3 text-sm font-bold text-[hsl(var(--accent-900))] transition-colors hover:bg-white/90 sm:w-auto"
          >
            Escrever agora
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mobile-scroll flex max-w-full gap-1 overflow-x-auto rounded-control bg-muted/60 p-1">
          {THEME_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors",
                filter === option.value ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fluid-grid gap-4 [--grid-min:18rem]">
        {shown.map((theme) => {
          const category = classifyTheme(theme);
          const meta = THEME_CATEGORY_META[category];
          const Icon = meta.icon;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onPick(theme)}
              className="group flex flex-col rounded-card bg-card p-5 text-left shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div className="mb-3.5 flex items-center justify-between">
                <span className={cn("grid h-11 w-11 place-items-center rounded-control", meta.tint)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="font-display text-lg font-medium leading-tight">{theme.title}</p>
              <p className="text-safe mt-2.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{theme.context}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                <span className="text-sm text-muted-foreground">{theme.source}</span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-primary opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Escrever
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ThemeCategory = "sociedade" | "tecnologia" | "meioambiente";

const THEME_FILTERS: { value: ThemeCategory | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "sociedade", label: "Sociedade" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "meioambiente", label: "Meio ambiente" },
];

const THEME_CATEGORY_META: Record<ThemeCategory, { icon: LucideIcon; tint: string }> = {
  sociedade: { icon: Users, tint: "bg-primary/10 text-primary" },
  tecnologia: { icon: Cpu, tint: "bg-info-tint text-info" },
  meioambiente: { icon: Leaf, tint: "bg-highlight-tint text-highlight" },
};

const TECH_KEYWORDS = ["tecnolog", "digital", "intelig", "internet", "dados", "inteligência"];
const ENV_KEYWORDS = ["ambient", "sustent", "clima", "florest", "desmatamento", "natureza"];

/** Categoria é uma heurística puramente visual (client-side) — a API de temas não expõe categoria. */
function classifyTheme(theme: EssayTheme): ThemeCategory {
  const haystack = `${theme.title} ${theme.context}`.toLowerCase();
  if (TECH_KEYWORDS.some((word) => haystack.includes(word))) return "tecnologia";
  if (ENV_KEYWORDS.some((word) => haystack.includes(word))) return "meioambiente";
  return "sociedade";
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
  const { phase, agentLabel, agentIndex, progressPercent, essay, error, elapsedSeconds, isSlow } = useCorrectionStatus(essayId);

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
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Correção em andamento</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">Analisando sua redação…</h1>
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Título</p>
            <p className="text-safe mt-1 text-sm font-semibold">{title}</p>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tamanho</p>
            <p className="mt-1 text-sm font-semibold">{wordCount} palavras</p>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Parágrafos</p>
            <p className="mt-1 text-sm font-semibold">{paragraphCount}</p>
          </div>
        </div>

        {isSlow ? (
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Isso está demorando mais que o normal ({elapsedSeconds}s). Pode continuar esperando ou voltar e conferir depois em
            &ldquo;Redações&rdquo;.
          </p>
        ) : null}

        <Button
          type="button"
          variant={isSlow ? "outline" : "ghost"}
          size="sm"
          className="mt-4"
          onClick={() => onFailed("Correção em andamento em segundo plano. Confira o resultado em alguns minutos na aba Redações.")}
        >
          Voltar para o editor
        </Button>
      </Surface>
    </div>
  );
}

