"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Flame,
  Gem,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Exercise } from "@/services/api";
import { cn } from "@/utils";

export type ExerciseNodeState = "locked" | "available" | "completed";
export type ExerciseNodeKind = "exercise" | "checkpoint" | "review" | "challenge" | "boss";

export type ExerciseNode = {
  id: string;
  label: string;
  subtitle: string;
  phaseTitle: string;
  difficulty: string;
  xp: number;
  step: number;
  totalSteps: number;
  state: ExerciseNodeState;
  kind: ExerciseNodeKind;
  exercise?: Exercise;
};

export type ExercisePhase = {
  id: string;
  title: string;
  subtitle: string;
  difficulty: string;
  nodes: ExerciseNode[];
};

export type ExerciseTrack = {
  id: string;
  title: string;
  subtitle: string;
  titleReward: string;
  difficulty: string;
  color: "primary" | "gold" | "accent";
  phases: ExercisePhase[];
};

export type ExerciseResult = {
  exercise_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  next_difficulty: string;
  xp_earned: number;
};

const trackBlueprints = [
  {
    id: "interpretacao",
    title: "Interpretação Textual",
    subtitle: "Campanha linear para dominar leitura, inferência e distratores do ENEM.",
    titleReward: "Mestre da Interpretação",
    difficulty: "Base ao avançado",
    color: "primary" as const,
    match: ["Compreensao", "Textos"],
  },
  {
    id: "gramatica",
    title: "Gramática Aplicada",
    subtitle: "Pontuação, coesão e norma-padrão em uma progressão controlada.",
    titleReward: "Aprendiz da Gramática",
    difficulty: "Precisão",
    color: "accent" as const,
    match: ["Pontuacao", "Coesao", "Funcoes", "Pontuação", "Coesão", "Funções"],
  },
  {
    id: "redacao",
    title: "Redação ENEM",
    subtitle: "Competências, tese, repertório e intervenção em etapas curtas.",
    titleReward: "Rei da Argumentação",
    difficulty: "Desafio ENEM",
    color: "gold" as const,
    match: ["Competencia", "Redacao", "Compreensao", "Competência", "Redação", "Compreensão"],
  },
];

const phaseTemplates = [
  {
    id: "fase-1",
    title: "Fase 1",
    subtitle: "Fundamentos",
    difficulty: "Base",
    nodes: [
      { label: "Exercício 1", kind: "exercise" as const },
      { label: "Exercício 2", kind: "exercise" as const },
      { label: "Marco 1", kind: "checkpoint" as const },
      { label: "Revisão rápida", kind: "review" as const },
      { label: "Mini desafio", kind: "challenge" as const },
    ],
  },
  {
    id: "fase-2",
    title: "Fase 2",
    subtitle: "Etapa intermediária",
    difficulty: "Intermediária",
    nodes: [
      { label: "Exercício 6", kind: "exercise" as const },
      { label: "Exercício 7", kind: "exercise" as const },
      { label: "Marco 2", kind: "checkpoint" as const },
      { label: "Revisão guiada", kind: "review" as const },
      { label: "Desafio relâmpago", kind: "challenge" as const },
    ],
  },
  {
    id: "boss",
    title: "Desafio final",
    subtitle: "Mini simulado",
    difficulty: "Final",
    nodes: [{ label: "Desafio final", kind: "boss" as const }],
  },
];

export function buildExerciseTracks(exercises: Exercise[], completedNodeIds: string[]): ExerciseTrack[] {
  const completed = new Set(completedNodeIds.map(String));

  return trackBlueprints.map((track) => {
    const matched = exercises.filter((exercise) => track.match.some((keyword) => exercise.skill.toLowerCase().includes(keyword.toLowerCase())));
    const fallback = exercises.filter((exercise) => !matched.some((item) => item.id === exercise.id));
    const pool = matched.length ? [...matched, ...fallback] : exercises;
    let globalIndex = 0;
    const totalSteps = phaseTemplates.reduce((sum, phase) => sum + phase.nodes.length, 0);

    const phases = phaseTemplates.map((phase) => {
      const nodes = phase.nodes.map((template, nodeIndex) => {
        const exercise = pool.length ? pool[globalIndex % pool.length] : undefined;
        const nodeId = `${track.id}-${phase.id}-${template.kind}-${nodeIndex + 1}`;
        const legacyComplete = exercise ? completed.has(String(exercise.id)) : false;
        const isCompleted = completed.has(nodeId) || legacyComplete;
        const firstLockedIndex = getFirstIncompleteIndex(track.id, completedNodeIds, exercises.length > 0);
        const isAvailable = exercises.length > 0 && globalIndex === firstLockedIndex;
        const state: ExerciseNodeState = isCompleted ? "completed" : isAvailable ? "available" : "locked";
        const node: ExerciseNode = {
          id: nodeId,
          label: template.label,
          subtitle: templateSubtitle(template.kind, exercise),
          phaseTitle: phase.title,
          difficulty: phase.difficulty,
          xp: template.kind === "boss" ? 80 : difficultyXp(exercise?.difficulty, template.kind),
          step: globalIndex + 1,
          totalSteps,
          state,
          kind: template.kind,
          exercise,
        };
        globalIndex += 1;
        return node;
      });

      return {
        id: `${track.id}-${phase.id}`,
        title: phase.title,
        subtitle: phase.subtitle,
        difficulty: phase.difficulty,
        nodes,
      };
    });

    return {
      id: track.id,
      title: track.title,
      subtitle: track.subtitle,
      titleReward: track.titleReward,
      difficulty: track.difficulty,
      color: track.color,
      phases,
    };
  });
}

export function getTrackProgress(track: ExerciseTrack) {
  const playable = track.phases.flatMap((phase) => phase.nodes).filter((node) => node.exercise);
  const completed = playable.filter((node) => node.state === "completed");
  return {
    completed: completed.length,
    total: playable.length,
    percent: playable.length ? Math.round((completed.length / playable.length) * 100) : 0,
  };
}

export function getFirstAvailableNode(track: ExerciseTrack) {
  return track.phases.flatMap((phase) => phase.nodes).find((node) => node.state === "available" && node.exercise);
}

export function ExerciseTrackTabs({
  tracks,
  activeTrackId,
  onChange,
}: {
  tracks: ExerciseTrack[];
  activeTrackId: string;
  onChange: (trackId: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {tracks.map((track) => {
        const progress = getTrackProgress(track);
        const active = activeTrackId === track.id;
        return (
          <button
            type="button"
            key={track.id}
            onClick={() => onChange(track.id)}
            className={cn(
              "min-w-[248px] rounded-lg border bg-background/68 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-card",
              active && "border-secondary/50 bg-secondary/12 shadow-glow",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{track.title}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{track.difficulty}</p>
              </div>
              <TrackIcon color={track.color} />
            </div>
            <div className="flex items-center gap-3">
              <Progress value={progress.percent} className="h-2" />
              <span className="text-xs font-black">{progress.percent}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TrailMap(props: {
  track: ExerciseTrack;
  activeNodeId?: string;
  onSelect: (node: ExerciseNode) => void;
}) {
  return <VerticalPath {...props} />;
}

export function VerticalPath({
  track,
  activeNodeId,
  onSelect,
}: {
  track: ExerciseTrack;
  activeNodeId?: string;
  onSelect: (node: ExerciseNode) => void;
}) {
  const progress = getTrackProgress(track);
  const nodes = track.phases.flatMap((phase) => phase.nodes);
  const availableNode = getFirstAvailableNode(track);

  return (
    <section className="glass-surface overflow-hidden rounded-lg">
      <div className="border-b bg-card/68 p-4 md:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Trilha vertical</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">{track.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{track.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
            <PathMetric label="Progresso" value={`${progress.percent}%`} />
            <PathMetric label="Proxima fase" value={availableNode?.label ?? "Finalizada"} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={progress.percent} className="h-2.5" />
          <span className="whitespace-nowrap text-sm font-black">
            {progress.completed}/{progress.total}
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-7 md:px-6 md:py-8">
        <ProgressConnector progress={progress.percent} />
        <div className="space-y-2">
          {nodes.map((node, index) => {
            const phaseStarts = track.phases.some((phase) => phase.nodes[0]?.id === node.id);
            return (
              <div key={node.id}>
                {phaseStarts && (
                  <div className="relative z-10 mb-2 ml-20 md:ml-0 md:text-center">
                    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs font-black uppercase text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                      {node.phaseTitle} - {node.difficulty}
                    </span>
                  </div>
                )}
                <PathStep
                  node={node}
                  index={index}
                  active={node.id === activeNodeId}
                  side={index % 2 === 0 ? "left" : "right"}
                  onSelect={() => onSelect(node)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ProgressConnector({ progress }: { progress: number }) {
  return (
    <div className="pointer-events-none absolute bottom-10 left-[46px] top-10 w-1 overflow-hidden rounded-full bg-border/70 md:left-1/2 md:-translate-x-1/2">
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${Math.min(100, Math.max(progress, 8))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full rounded-full bg-primary shadow-sm"
      />
    </div>
  );
}

function PathStep({
  node,
  index,
  active,
  side,
  onSelect,
}: {
  node: ExerciseNode;
  index: number;
  active: boolean;
  side: "left" | "right";
  onSelect: () => void;
}) {
  const locked = node.state === "locked" || !node.exercise;
  const brief = <NodeBrief node={node} align={side === "left" ? "right" : "left"} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.035, ease: "easeOut" }}
      className="relative z-10 grid min-h-[124px] grid-cols-[88px_1fr] items-center gap-3 md:grid-cols-[1fr_112px_1fr] md:gap-5"
    >
      <div className={cn("hidden md:block", side === "left" ? "md:order-1" : "md:order-3")}>{brief}</div>
      <div className="order-1 grid place-items-center md:order-2">
        <ExerciseNode node={node} active={active} disabled={locked} onSelect={onSelect} />
      </div>
      <div className={cn("order-2 md:hidden", locked && "opacity-70")}>
        <NodeBrief node={node} align="left" />
      </div>
      <div className={cn("hidden md:block", side === "left" ? "md:order-3" : "md:order-1")}>
        <div className="h-px w-16 bg-border" />
      </div>
    </motion.div>
  );
}

export function ExerciseNode({
  node,
  active,
  disabled,
  onSelect,
}: {
  node: ExerciseNode;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  if (node.kind === "boss") {
    return <BossNode node={node} active={active} disabled={disabled} onSelect={onSelect} />;
  }
  if (node.state === "completed") {
    return <CompletedNode node={node} active={active} onSelect={onSelect} />;
  }
  if (node.state === "locked") {
    return <LockedNode node={node} />;
  }
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -3, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      animate={{ scale: [1, 1.035, 1], boxShadow: ["0 0 0 rgba(201,162,39,0)", "0 0 34px rgba(201,162,39,.28)", "0 0 0 rgba(201,162,39,0)"] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "group relative grid h-20 w-20 place-items-center rounded-2xl border border-secondary/55 bg-secondary text-secondary-foreground shadow-sm",
        active && "ring-4 ring-secondary/25",
      )}
      aria-label={`Abrir ${node.label}`}
    >
      <span className="absolute inset-1 rounded-xl border border-foreground/10 bg-foreground/10" />
      <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-foreground/10 shadow-sm">
        {node.kind === "checkpoint" ? <ShieldCheck className="h-5 w-5" /> : node.kind === "challenge" ? <Zap className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </span>
      <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-black text-accent-foreground shadow-glow">
        {node.step}
      </span>
    </motion.button>
  );
}

export function LockedNode({ node }: { node: ExerciseNode }) {
  return (
    <button
      type="button"
      disabled
      className="relative grid h-[72px] w-[72px] place-items-center rounded-2xl border border-white/7 bg-ink/18 text-muted-foreground opacity-80 shadow-sm dark:bg-black/34"
      aria-label={`${node.label} bloqueado`}
    >
      <span className="absolute inset-1 rounded-xl border border-white/7 bg-black/5" />
      <Lock className="relative h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export function CompletedNode({
  node,
  active,
  onSelect,
}: {
  node: ExerciseNode;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative grid h-20 w-20 place-items-center rounded-2xl border border-accent/42 bg-accent text-accent-foreground shadow-sm",
        active && "ring-4 ring-accent/20",
      )}
      aria-label={`Rever ${node.label}`}
    >
      <span className="absolute inset-1 rounded-xl border border-foreground/10 bg-foreground/10" />
      <motion.span
        initial={{ scale: 0.7, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        className="relative grid h-11 w-11 place-items-center rounded-xl bg-foreground/10"
      >
        <Check className="h-6 w-6" aria-hidden="true" />
      </motion.span>
    </motion.button>
  );
}

export function BossNode({
  node,
  active,
  disabled,
  onSelect,
}: {
  node: ExerciseNode;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const completed = node.state === "completed";
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      whileHover={disabled ? undefined : { y: -4, scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      animate={node.state === "available" ? { boxShadow: ["0 0 0 rgba(201,162,39,0)", "0 0 44px rgba(201,162,39,.32)", "0 0 0 rgba(201,162,39,0)"] } : undefined}
      transition={{ duration: 2.4, repeat: node.state === "available" ? Infinity : 0, ease: "easeInOut" }}
      className={cn(
        "relative grid h-24 w-24 place-items-center rounded-[1.35rem] border text-secondary-foreground shadow-sm",
        node.state === "locked" && "border-white/8 bg-ink/22 text-muted-foreground opacity-80 dark:bg-black/36",
        node.state === "available" && "border-secondary/60 bg-secondary shadow-sm",
        completed && "border-accent/40 bg-accent",
        active && "ring-4 ring-secondary/25",
      )}
      aria-label={`${node.label} etapa final`}
    >
      <span className="absolute inset-1 rounded-2xl border border-foreground/10 bg-foreground/10" />
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-foreground/10">
        {node.state === "locked" ? <Lock className="h-6 w-6" /> : completed ? <Crown className="h-7 w-7" /> : <Trophy className="h-7 w-7" />}
      </span>
    </motion.button>
  );
}

function NodeBrief({ node, align }: { node: ExerciseNode; align: "left" | "right" }) {
  return (
    <div className={cn("max-w-[270px]", align === "right" && "ml-auto text-right")}>
      <div className={cn("mb-2 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-black uppercase", stateBadge(node.state))}>
        {node.state === "locked" ? <Lock className="h-3.5 w-3.5" /> : node.state === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
        {stateLabel(node.state)}
      </div>
      <p className="text-sm font-black tracking-normal">{node.label}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{node.subtitle}</p>
      <div className={cn("mt-2 flex items-center gap-2 text-xs font-black text-secondary", align === "right" && "justify-end")}>
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        +{node.xp} XP
      </div>
    </div>
  );
}

function PathMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/58 p-3">
      <p className="text-[11px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

export function MissionCard({
  title,
  description,
  progress,
  target,
  reward,
  icon,
}: {
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  icon: "daily" | "weekly" | "combo";
}) {
  const Icon = icon === "daily" ? Target : icon === "weekly" ? Trophy : Flame;
  const percent = Math.min(100, (progress / target) * 100);
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border bg-background/58 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/18 text-secondary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground">
          {progress}/{target}
        </span>
        <span className="font-black text-secondary">{reward}</span>
      </div>
      <Progress value={percent} className="h-2" />
    </motion.div>
  );
}

export function XpBar({
  xp,
  level,
  combo,
  streak = 4,
}: {
  xp: number;
  level: number;
  combo: number;
  streak?: number;
}) {
  const progress = xp % 250 ? ((xp % 250) / 250) * 100 : 100;
  return (
    <div className="glass-surface overflow-hidden rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Progressão</p>
          <p className="mt-1 text-2xl font-black tracking-normal">Nível {level}</p>
        </div>
        <div className="rounded-lg bg-secondary/18 px-3 py-2 text-sm font-black text-secondary">{xp} XP</div>
      </div>
      <Progress value={progress} className="h-2.5" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border bg-background/54 p-2">
          <p className="text-[11px] text-muted-foreground">Combo</p>
          <p className="text-sm font-black text-accent">{combo}x</p>
        </div>
        <div className="rounded-md border bg-background/54 p-2">
          <p className="text-[11px] text-muted-foreground">Sequência</p>
          <p className="text-sm font-black text-secondary">{streak} dias</p>
        </div>
      </div>
    </div>
  );
}

export function ExercisePlayPanel({
  node,
  selectedAnswer,
  result,
  combo,
  onSelectAnswer,
  onSubmit,
  onRetry,
}: {
  node?: ExerciseNode;
  selectedAnswer?: string;
  result?: ExerciseResult;
  combo: number;
  onSelectAnswer: (answer: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  if (!node?.exercise) {
    return (
      <section className="glass-surface grid min-h-[420px] place-items-center rounded-lg p-6 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-secondary/18 text-secondary shadow-glow">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xl font-black tracking-normal">Continue pela campanha</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">A etapa amarela é a única liberada agora. Complete para abrir a próxima.</p>
        </div>
      </section>
    );
  }

  const exercise = node.exercise;

  return (
    <section className="glass-surface overflow-hidden rounded-lg">
      <div className="border-b bg-card/64 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">
              {node.phaseTitle} / passo {node.step} de {node.totalSteps}
            </p>
            <h2 className="mt-1 text-xl font-black tracking-normal">{node.kind === "boss" ? "Desafio final" : exercise.skill}</h2>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent/12 px-3 py-2 text-sm font-black text-accent">
            <Flame className="h-4 w-4" aria-hidden="true" />
            {combo}x
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={result ? 100 : selectedAnswer ? 72 : 34} className="h-2.5" />
          <span className="text-xs font-black text-secondary">+{node.xp} XP</span>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <p className="text-base font-black leading-7 tracking-normal">{exercise.statement}</p>
        <div className="space-y-3">
          {exercise.options.map((option) => {
            const letter = option.slice(0, 1);
            const active = selectedAnswer === letter;
            const isCorrect = result?.correct_answer === letter;
            const isWrong = result?.selected_answer === letter && !result?.is_correct;
            return (
              <button
                key={option}
                type="button"
                disabled={Boolean(result)}
                onClick={() => onSelectAnswer(letter)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border bg-background/54 p-3 text-left text-sm leading-6 transition-all hover:-translate-y-0.5 hover:bg-muted/64",
                  active && "border-primary bg-primary/8",
                  isCorrect && "border-accent bg-accent/12",
                  isWrong && "border-destructive bg-destructive/10",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-md border text-xs font-black",
                    active && "bg-primary text-primary-foreground",
                    isCorrect && "bg-accent text-accent-foreground",
                    isWrong && "bg-destructive text-destructive-foreground",
                  )}
                >
                  {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : letter}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {result ? (
          <div className={cn("rounded-lg border p-4 text-sm leading-6", result.is_correct ? "bg-accent/10" : "bg-destructive/10")}>
            <p className="font-black">{result.is_correct ? `Etapa concluída +${result.xp_earned} XP` : "Etapa não concluída"}</p>
            <p className="mt-1 text-muted-foreground">{result.explanation}</p>
            {!result.is_correct && (
              <Button onClick={onRetry} variant="outline" className="mt-4 w-full">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={onSubmit} disabled={!selectedAnswer} className="w-full">
            Confirmar resposta
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  );
}

export function RewardModal({
  open,
  xp,
  combo,
  title,
  nextLabel,
  actionLabel = "Continuar trilha",
  onClose,
}: {
  open: boolean;
  xp: number;
  combo: number;
  title: string;
  nextLabel?: string;
  actionLabel?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="glass-surface w-full max-w-md rounded-lg p-6 text-center"
      >
        <motion.div
          initial={{ rotate: -12, scale: 0.82 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground shadow-glow"
        >
          <Gem className="h-8 w-8" aria-hidden="true" />
        </motion.div>
        <p className="text-sm font-black uppercase text-muted-foreground">Etapa concluída</p>
        <h2 className="mt-2 text-3xl font-black tracking-normal">{title}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-background/58 p-4">
            <p className="text-xs text-muted-foreground">XP ganho</p>
            <p className="mt-1 text-2xl font-black text-secondary">+{xp}</p>
          </div>
          <div className="rounded-lg border bg-background/58 p-4">
            <p className="text-xs text-muted-foreground">Combo</p>
            <p className="mt-1 text-2xl font-black text-accent">{combo}x</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border bg-accent/10 p-3 text-sm">
          <p className="font-black text-accent">Proximo desbloqueio</p>
          <p className="mt-1 text-muted-foreground">{nextLabel ?? "Campanha completa"}</p>
        </div>
        <Button className="mt-5 w-full" onClick={onClose}>
          {actionLabel}
        </Button>
      </motion.div>
    </div>
  );
}

export function CompletionScreen({
  title,
  completed,
  total,
}: {
  title: string;
  completed: number;
  total: number;
}) {
  if (completed < total || total === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-secondary/12 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-black">{title} finalizada</p>
          <p className="text-sm text-muted-foreground">Desafio final vencido. Nova campanha pronta para o proximo ciclo.</p>
        </div>
      </div>
    </motion.div>
  );
}

export function MiniTrailPreview({ progress = 42 }: { progress?: number }) {
  const states: ExerciseNodeState[] = ["completed", "completed", "available", "locked", "locked"];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Campanha ativa</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Interpretação Textual</h2>
        </div>
        <div className="rounded-md bg-secondary/14 px-3 py-2 text-xs font-black text-secondary">{progress}%</div>
      </div>
      <div className="relative ml-2 space-y-3 py-1">
        <div className="absolute bottom-6 left-5 top-6 w-1 rounded-full bg-border" />
        {states.map((state, index) => (
          <div key={`${state}-${index}`} className="relative z-10 flex items-center gap-3">
            <div
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl border bg-background text-muted-foreground shadow-sm",
                state === "completed" && "bg-accent text-accent-foreground",
                state === "available" && "bg-secondary text-secondary-foreground shadow-glow",
              )}
            >
              {state === "locked" ? <Lock className="h-4 w-4" /> : state === "completed" ? <Check className="h-5 w-5" /> : <Star className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black">Fase {index + 1}</p>
              <p className="text-xs text-muted-foreground">{stateLabel(state)}</p>
            </div>
          </div>
        ))}
      </div>
      <Progress value={progress} />
    </div>
  );
}

function getFirstIncompleteIndex(trackId: string, completedNodeIds: string[], hasExercises: boolean) {
  if (!hasExercises) return -1;
  const completed = new Set(completedNodeIds.map(String));
  const ids = phaseTemplates.flatMap((phase) => phase.nodes.map((node, index) => `${trackId}-${phase.id}-${node.kind}-${index + 1}`));
  const first = ids.findIndex((id) => !completed.has(id));
  return first === -1 ? ids.length : first;
}

function templateSubtitle(kind: ExerciseNodeKind, exercise?: Exercise) {
  if (kind === "boss") return "Mini simulado final para fechar a campanha.";
  if (kind === "checkpoint") return `Marco de ${exercise?.skill ?? "habilidade"}.`;
  if (kind === "review") return `Revisão curta antes da próxima fase.`;
  if (kind === "challenge") return `Desafio rápido com ganho maior de XP.`;
  return exercise?.skill ?? "Exercício bloqueado";
}

function difficultyXp(difficulty?: string, kind?: ExerciseNodeKind) {
  const boost = kind === "challenge" || kind === "checkpoint" ? 8 : kind === "review" ? 4 : 0;
  if (difficulty === "hard") return 32 + boost;
  if (difficulty === "easy") return 14 + boost;
  return 22 + boost;
}

function stateLabel(state: ExerciseNodeState) {
  if (state === "locked") return "Bloqueado";
  if (state === "completed") return "Concluido";
  return "Liberado";
}

function stateBadge(state: ExerciseNodeState) {
  if (state === "locked") return "bg-muted text-muted-foreground";
  if (state === "completed") return "bg-accent/12 text-accent";
  return "bg-secondary/18 text-secondary";
}

function TrackIcon({ color }: { color: ExerciseTrack["color"] }) {
  const className = {
    primary: "bg-primary/12 text-primary",
    gold: "bg-primary/18 text-primary",
    accent: "bg-accent/12 text-accent",
  }[color];
  const Icon = color === "gold" ? Trophy : color === "accent" ? ShieldCheck : Zap;
  return (
    <div className={cn("grid h-9 w-9 place-items-center rounded-lg", className)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}
