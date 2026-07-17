"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { AlertCircle, Brain, Check, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

import { EssayEditor } from "@/components/writing/essay-editor";
import { CompetencyLabel, EssayAnalysisWorkspace, ScoreRing } from "@/components/writing/essay-analysis";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCorrectionStatus } from "@/hooks/useCorrectionStatus";
import { useEssayDraft } from "@/hooks/useEssayDraft";
import { useEssaySubmission } from "@/hooks/useEssaySubmission";
import { type Essay, type EssayTheme } from "@/services/api";
import { cn } from "@/utils";

const THEME_TONE = [
  { card: "bg-primary/8", ring: "ring-primary", check: "bg-primary text-primary-foreground" },
  { card: "bg-info-tint/60", ring: "ring-info", check: "bg-info text-info-foreground" },
  { card: "bg-streak-tint/60", ring: "ring-streak", check: "bg-streak text-streak-foreground" },
  { card: "bg-highlight-tint/60", ring: "ring-highlight", check: "bg-highlight text-highlight-foreground" },
] as const;

export default function EssayPage() {
  const draft = useEssayDraft();
  const {
    themes,
    selectedTheme,
    setSelectedTheme,
    essay,
    title,
    content,
    setTitle,
    setContent,
    draftStarted,
    saving,
    submitting,
    setSubmitting,
    generatingTheme,
    mode,
    error,
    loading,
    saveRequestRef,
    submittingRef,
    wordCount,
    paragraphCount,
    createDraft,
    generateTheme,
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
        eyebrow="Laboratório de redação"
        title="Escolha um tema, escreva e envie para correção."
        description="Acompanhe linhas, parágrafos e estrutura enquanto escreve. Depois, veja a nota por competência ENEM."
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
  const uniqueThemes = themes.filter((theme, index) => themes.findIndex((other) => other.title === theme.title) === index);

  return (
    <Surface className="p-4 lg:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Banco de temas</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">Escolha o tema da redacao</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={generating} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {generating ? "Sorteando..." : "Sortear temas"}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {uniqueThemes.map((theme, index) => {
          const tone = THEME_TONE[index % THEME_TONE.length];
          const isSelected = selectedTheme?.id === theme.id;
          return (
            <button
              type="button"
              key={theme.id}
              onClick={() => onSelect(theme)}
              className={cn(
                "group grid min-h-[9.5rem] w-full content-start rounded-control p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5",
                tone.card,
                isSelected && cn("ring-2", tone.ring),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-5">{theme.title}</p>
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-card text-transparent transition-colors",
                    isSelected && tone.check,
                  )}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <p className="text-safe mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{theme.context}</p>
              <div className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Selecionar
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </button>
          );
        })}
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
    <Surface className={cn("p-4 lg:p-5 xl:sticky xl:top-4", selectedTheme && "bg-primary text-primary-foreground")}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-control",
            selectedTheme ? "bg-white/15" : "bg-primary/12 text-primary",
          )}
        >
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", selectedTheme ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {selectedTheme ? "Tudo pronto" : "Próxima etapa"}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">
            {selectedTheme ? "Comece a escrever agora." : "Escolha o tema ao lado."}
          </h2>
        </div>
      </div>

      <div className={cn("mt-5 rounded-control p-4", selectedTheme ? "bg-white/10" : "bg-background/60")}>
        <p className={cn("text-xs font-semibold uppercase tracking-[0.12em]", selectedTheme ? "text-primary-foreground/70" : "text-muted-foreground")}>
          Tema selecionado
        </p>
        <p className="text-safe mt-2 text-sm font-semibold leading-5">{selectedTheme?.title ?? "Selecione um tema no banco ao lado."}</p>
        {selectedTheme ? (
          <p className="text-safe mt-2 line-clamp-3 text-xs leading-5 text-primary-foreground/80">{selectedTheme.context}</p>
        ) : null}
      </div>

      <Button
        className={cn("mt-6 w-full", selectedTheme && "bg-white text-primary hover:bg-white/90")}
        onClick={onCreateDraft}
        disabled={!selectedTheme}
      >
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

function CorrectionPanel({ correction, error }: { correction: Essay["correction"]; error: string }) {
  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Correção</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">Resultado da correção</h2>
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
                <CompetencyLabel code={String(label)} />
                <Progress value={(Number(value) / 200) * 100} className="h-2" />
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Ainda não tem correção aqui. Envie o texto e a IA mostra, competência por competência, onde focar primeiro.
        </p>
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
