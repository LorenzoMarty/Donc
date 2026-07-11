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
  return (
    <Surface className="p-4 lg:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Banco de temas</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">Escolha o tema da redacao</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={generating} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {generating ? "Sorteando..." : "Sortear 4 temas"}
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Próxima etapa</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">Escolha o tema e comece a escrever.</h2>
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
        <p className="text-sm leading-6 text-muted-foreground">Envie a redação para ver a nota e os comentários por competência.</p>
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
