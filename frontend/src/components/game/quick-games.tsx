"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Award, Bolt, Brain, Check, CheckCircle2, Flame, Flag, Gem, HeartPulse, Lock, Play, Search, Shield, Sparkles, Star, Swords, Trophy, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type Exercise } from "@/services/api";
import { cn } from "@/utils";
import type { ExerciseNode, ExerciseTrack } from "./exercise-game";

export type GameReward = {
  title: string;
  description: string;
  xp: number;
  badge?: string;
  nextLabel?: string;
};

type MiniGameProps = {
  exercise?: Exercise;
  combo: number;
  onComplete: (reward: GameReward) => void;
  onMiss?: (message: string) => void;
};

type Piece = {
  id: string;
  label: string;
  hint?: string;
  tone?: "yellow" | "blue" | "green" | "red" | "dark";
};

type Slot = {
  id: string;
  label: string;
  accepts: string;
};

const pop = {
  initial: { opacity: 0, scale: 0.92, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
};

export function XPBar({ xp, level, nextXp = 1000 }: { xp: number; level: number; nextXp?: number }) {
  const progress = Math.min(100, Math.round((xp / nextXp) * 100));
  return (
    <div className="rounded-2xl border-2 border-foreground bg-card p-3 shadow-[0_5px_0_hsl(var(--foreground))]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black text-muted-foreground">Nível {level}</p>
            <p className="text-sm font-black">{xp} XP</p>
          </div>
        </div>
        <span className="rounded-lg bg-muted px-2 py-1 text-xs font-black">{progress}%</span>
      </div>
      <Progress value={progress} className="h-3" />
    </div>
  );
}

export function StreakCard({ streak }: { streak: number }) {
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="flex items-center justify-between rounded-2xl border-2 border-foreground bg-card p-3 shadow-[0_5px_0_hsl(var(--foreground))]">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/18 dark:text-orange-200">
          <Flame className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-black text-muted-foreground">Sequência</p>
          <p className="text-sm font-black">{streak} dias</p>
        </div>
      </div>
      <span className="rounded-lg bg-accent/14 px-2 py-1 text-xs font-black text-accent">acesa</span>
    </motion.div>
  );
}

export function ComboSystem({ combo }: { combo: number }) {
  return <ComboMeter combo={combo} />;
}

export function ComboMeter({ combo }: { combo: number }) {
  const label = combo >= 8 ? "Modo imparável" : combo >= 5 ? "Ritmo quente" : combo >= 3 ? "Combo vivo" : "Carregando combo";
  return (
    <motion.div
      key={combo}
      initial={{ scale: 0.92, rotate: -1 }}
      animate={{ scale: 1, rotate: 0 }}
      className="relative overflow-hidden rounded-2xl border-2 border-foreground bg-primary p-3 text-primary-foreground shadow-[0_5px_0_hsl(var(--foreground))]"
    >
      <div className="absolute right-3 top-2 text-3xl font-black opacity-10">{combo}x</div>
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-black">{label}</span>
        </div>
        <span className="rounded-lg bg-foreground/10 px-2 py-1 text-xs font-black">{combo}x</span>
      </div>
    </motion.div>
  );
}

export function GameHUD({
  title,
  combo,
  xp,
  energy,
  multiplier = 1,
}: {
  title: string;
  combo: number;
  xp: number;
  energy: number;
  multiplier?: number;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border-2 border-foreground bg-card p-2 shadow-[0_5px_0_hsl(var(--foreground))] sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex items-center gap-2">
        <GameMascot mood={combo > 2 ? "happy" : "ready"} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{title}</p>
          <p className="text-xs font-bold text-muted-foreground">toque, encaixe, avance</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <HudPill icon={Bolt} label="XP" value={String(xp)} />
        <HudPill icon={Flame} label="Combo" value={`${combo}x`} />
        <HudPill icon={HeartPulse} label="Energia" value={`${energy}%`} />
        <HudPill icon={Sparkles} label="Ritmo" value={`${multiplier}x`} />
      </div>
    </div>
  );
}

function HudPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-2 py-1.5">
      <Icon className="mx-auto h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <p className="mt-0.5 text-[10px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="text-xs font-black">{value}</p>
    </div>
  );
}

export function GameMascot({ mood = "ready", size = "md" }: { mood?: "ready" | "happy" | "alert"; size?: "sm" | "md" }) {
  return (
    <motion.div
      animate={{ y: [0, -4, 0], rotate: mood === "alert" ? [0, -3, 3, 0] : [0, 1, 0] }}
      transition={{ duration: mood === "alert" ? 0.8 : 2.4, repeat: Infinity, ease: "easeInOut" }}
      className={cn("relative shrink-0 rounded-2xl border-2 border-foreground bg-primary shadow-[0_4px_0_hsl(var(--foreground))]", size === "sm" ? "h-11 w-11" : "h-16 w-16")}
      aria-label="Mascote Núcleo D"
    >
      <div className="absolute inset-2 rounded-xl bg-background/42" />
      <div className="absolute left-3 top-4 h-2 w-2 rounded-full bg-foreground" />
      <div className="absolute right-3 top-4 h-2 w-2 rounded-full bg-foreground" />
      <div className={cn("absolute left-1/2 top-8 h-1.5 -translate-x-1/2 rounded-full bg-foreground", mood === "happy" ? "w-6" : mood === "alert" ? "w-2" : "w-4")} />
      <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-accent" aria-hidden="true" />
    </motion.div>
  );
}

export function InteractiveCard({
  children,
  selected,
  solved,
  disabled,
  onClick,
  className,
  draggable,
  onDragStart,
}: {
  children: ReactNode;
  selected?: boolean;
  solved?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      whileHover={!disabled ? { y: -5, rotate: selected ? 0 : -1 } : undefined}
      whileTap={!disabled ? { scale: 0.95, y: 2 } : undefined}
      className={cn(
        "relative min-h-20 rounded-2xl border-2 border-foreground bg-card p-3 text-left shadow-[0_6px_0_hsl(var(--foreground))] transition disabled:cursor-not-allowed disabled:opacity-45",
        selected && "bg-primary text-primary-foreground",
        solved && "bg-accent text-accent-foreground",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function XPBurst({ amount, show }: { amount: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 8 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1.1, 1], y: -28 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute right-5 top-5 z-20 rounded-full border-2 border-foreground bg-primary px-3 py-1 text-sm font-black text-primary-foreground shadow-[0_4px_0_hsl(var(--foreground))]"
        >
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RewardExplosion({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 18 }, (_, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, x: "50%", y: "55%", scale: 0.5 }}
              animate={{
                opacity: [0, 1, 0],
                x: `${50 + Math.cos(index) * (28 + (index % 4) * 9)}%`,
                y: `${55 + Math.sin(index * 1.7) * (24 + (index % 5) * 7)}%`,
                scale: [0.5, 1, 0.2],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("absolute h-2.5 w-2.5 rounded-full", index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-accent" : "bg-secondary")}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedPath({ progress = 0 }: { progress?: number }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 10 78 C 24 45, 34 92, 48 50 S 70 10, 90 32" fill="none" stroke="hsl(var(--border))" strokeWidth="2.8" strokeLinecap="round" />
      <motion.path
        d="M 10 78 C 24 45, 34 92, 48 50 S 70 10, 90 32"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3.2"
        strokeLinecap="round"
        pathLength={100}
        initial={{ strokeDasharray: "0 100" }}
        animate={{ strokeDasharray: `${progress} 100` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </svg>
  );
}

export function WorldMap({
  track,
  activeNodeId,
  completedNodeIds,
  onSelect,
}: {
  track: ExerciseTrack;
  activeNodeId?: string;
  completedNodeIds: string[];
  onSelect?: (node: ExerciseNode) => void;
}) {
  const completed = new Set(completedNodeIds);
  const flatNodes = track.phases.flatMap((phase) => phase.nodes);
  const playableNodes = flatNodes.filter((node) => node.exercise);
  const progress = playableNodes.length ? Math.round((playableNodes.filter((node) => completed.has(node.id) || node.state === "completed").length / playableNodes.length) * 100) : 0;
  const regions = regionForTrack(track.title);

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-foreground bg-[#fff8dd] p-4 shadow-[0_7px_0_hsl(var(--foreground))] dark:bg-card">
      <AnimatedPath progress={progress} />
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{regions.world}</p>
          <h2 className="text-xl font-black">{regions.area}</h2>
        </div>
        <div className="rounded-2xl border-2 border-foreground bg-background px-3 py-2 text-center shadow-[0_4px_0_hsl(var(--foreground))]">
          <p className="text-[10px] font-black uppercase text-muted-foreground">mapa</p>
          <p className="text-sm font-black">{progress}%</p>
        </div>
      </div>

      <div className="relative grid min-h-[190px] grid-cols-3 gap-3 sm:grid-cols-6">
        {flatNodes.map((node, index) => {
          const isDone = completed.has(node.id) || node.state === "completed";
          const isActive = activeNodeId === node.id;
          const isLocked = node.state === "locked";
          const Icon = node.kind === "boss" ? Swords : node.kind === "checkpoint" ? Shield : node.kind === "review" ? Brain : Play;
          return (
            <motion.button
              key={node.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelect?.(node)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: index % 2 ? 18 : 0 }}
              whileHover={!isLocked ? { y: index % 2 ? 12 : -6, scale: 1.04 } : undefined}
              whileTap={!isLocked ? { scale: 0.94 } : undefined}
              transition={{ delay: index * 0.035, type: "spring", stiffness: 260, damping: 18 }}
              className={cn(
                "relative grid h-20 place-items-center rounded-3xl border-2 border-foreground text-sm font-black shadow-[0_6px_0_hsl(var(--foreground))]",
                isDone && "bg-accent text-accent-foreground",
                isActive && !isDone && "bg-primary text-primary-foreground",
                !isActive && !isDone && !isLocked && "bg-background",
                isLocked && "cursor-not-allowed bg-muted text-muted-foreground opacity-70 shadow-none",
                node.kind === "boss" && "h-24 bg-secondary text-secondary-foreground",
              )}
              aria-label={`${node.label}: ${isDone ? "concluído" : isLocked ? "bloqueado" : "liberado"}`}
            >
              {isDone ? <Check className="h-7 w-7" aria-hidden="true" /> : isLocked ? <Lock className="h-6 w-6" aria-hidden="true" /> : <Icon className="h-7 w-7" aria-hidden="true" />}
              {isActive && <motion.span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-destructive" animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressPath(props: Parameters<typeof WorldMap>[0]) {
  return <WorldMap {...props} />;
}

export function RewardPopup({ reward, onContinue }: { reward: GameReward | null; onContinue: () => void }) {
  return (
    <AnimatePresence>
      {reward && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ scale: 0.86, rotate: -2, y: 20 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-foreground bg-card p-5 text-center shadow-[0_8px_0_hsl(var(--foreground))]"
          >
            <RewardExplosion active />
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--foreground))]">
              <Trophy className="h-10 w-10" aria-hidden="true" />
            </div>
            <p className="relative mt-4 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">fase vencida</p>
            <h2 className="relative mt-2 text-3xl font-black">{reward.title}</h2>
            <p className="relative mt-2 text-sm leading-6 text-muted-foreground">{reward.description}</p>
            <div className="relative mt-4 flex items-center justify-center gap-2">
              <span className="rounded-2xl border-2 border-foreground bg-primary px-3 py-1.5 text-sm font-black text-primary-foreground">+{reward.xp} XP</span>
              {reward.badge && <span className="rounded-2xl border-2 border-foreground bg-accent px-3 py-1.5 text-sm font-black text-accent-foreground">{reward.badge}</span>}
            </div>
            <Button className="relative mt-5 w-full rounded-2xl" onClick={onContinue}>
              {reward.nextLabel ?? "Continuar"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function QuickQuiz({
  exercise,
  combo,
  onComplete,
  onMiss,
  onSubmitAnswer,
}: MiniGameProps & {
  onSubmitAnswer?: (selected: string) => Promise<{ correct: boolean; explanation?: string }>;
}) {
  const fallback = {
    statement: "Qual alternativa mantém a ideia de causa e consequência?",
    options: ["A) Como resultado", "B) Apesar disso", "C) Por exemplo", "D) Em primeiro lugar"],
  };
  const statement = exercise?.statement ?? fallback.statement;
  const options = exercise?.options?.length ? exercise.options : fallback.options;
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "hit" | "miss">("idle");
  const [burst, setBurst] = useState(false);

  async function answer(option: string) {
    if (status === "hit") return;
    setSelected(option);
    const result = onSubmitAnswer ? await onSubmitAnswer(option) : { correct: option === options[0] };
    if (result.correct) {
      setStatus("hit");
      setBurst(true);
      window.setTimeout(() => onComplete({ title: "Survival limpo", description: "Você desviou do distrator e manteve a leitura viva.", xp: 45 + combo * 5, badge: "Survival" }), 520);
      return;
    }
    setStatus("miss");
    onMiss?.(result.explanation ?? "Esse caminho era um distrator. Escolha a carta com melhor sentido.");
    window.setTimeout(() => setStatus("idle"), 520);
  }

  return (
    <GameStage title="Interpretação Survival" subtitle="Escolha a carta certa antes que o distrator domine." icon={Play} combo={combo} xp={45 + combo * 5} energy={status === "miss" ? 62 : 94} mascotMood={status === "miss" ? "alert" : status === "hit" ? "happy" : "ready"}>
      <XPBurst amount={45 + combo * 5} show={burst} />
      <motion.div animate={status === "miss" ? { x: [-8, 8, -4, 4, 0] } : undefined} className="rounded-3xl border-2 border-foreground bg-background p-4 shadow-[0_5px_0_hsl(var(--foreground))]">
        <p className="text-base font-black leading-7 md:text-lg">{statement}</p>
      </motion.div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option, index) => (
          <InteractiveCard key={option} selected={selected === option} solved={status === "hit" && selected === option} onClick={() => answer(option)} className="min-h-24">
            <div className="mb-2 flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-xs font-black">{index + 1}</span>
              <Bolt className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm font-black leading-6">{option}</p>
          </InteractiveCard>
        ))}
      </div>
    </GameStage>
  );
}

export function ConnectiveChallenge({ combo, onComplete, onMiss }: MiniGameProps) {
  const pieces: Piece[] = [
    { id: "entretanto", label: "Entretanto", hint: "contraste", tone: "red" },
    { id: "portanto", label: "Portanto", hint: "consequência", tone: "green" },
    { id: "alem", label: "Além disso", hint: "adição", tone: "blue" },
  ];
  const slots: Slot[] = [{ id: "ponte", label: "ponte lógica", accepts: "portanto" }];

  return (
    <GameStage title="Connect Flow" subtitle="Encaixe o conectivo e veja a frase acender." icon={Zap} combo={combo} xp={38 + combo * 4} energy={88}>
      <div className="rounded-3xl border-2 border-foreground bg-background p-4 text-sm font-bold leading-7 shadow-[0_5px_0_hsl(var(--foreground))]">
        O acesso desigual à tecnologia limita a participação dos estudantes.
        <span className="mx-2 inline-flex rounded-xl bg-primary/22 px-3 py-1 font-black">ponte</span>
        políticas públicas devem ampliar a inclusão digital.
      </div>
      <DragDropPuzzle
        pieces={pieces}
        slots={slots}
        successLabel="Frase conectada"
        onSuccess={() => onComplete({ title: "Fluxo conectado", description: "A relação de consequência ficou clara e a coesão subiu.", xp: 38 + combo * 4, badge: "Connect Flow" })}
        onFail={() => onMiss?.("Essa peça muda o sentido. Procure a ponte de consequência.")}
      />
    </GameStage>
  );
}

export function StopGame({ combo, onComplete, onMiss }: MiniGameProps) {
  const letter = ["B", "C", "M", "A"][combo % 4];
  const [burst, setBurst] = useState(false);
  const categories = useMemo(
    () => [
      { id: "conectivo", label: "Conectivo", options: optionSet(letter, "conectivo") },
      { id: "repertorio", label: "Repertório", options: optionSet(letter, "repertorio") },
      { id: "filosofo", label: "Pensador", options: optionSet(letter, "filosofo") },
      { id: "obra", label: "Obra", options: optionSet(letter, "obra") },
      { id: "tese", label: "Tese", options: optionSet(letter, "tese") },
    ],
    [letter],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const completed = Object.keys(answers).length;

  function choose(categoryId: string, option: string, correct: boolean) {
    if (!correct) {
      onMiss?.("Pegadinha. A carta precisa combinar com a letra da rodada.");
      return;
    }
    setAnswers((current) => ({ ...current, [categoryId]: option }));
  }

  useEffect(() => {
    if (completed !== categories.length) return;
    setBurst(true);
    const id = window.setTimeout(() => onComplete({ title: "Stop estourado", description: "Você fechou a rodada como party game de repertório.", xp: 75 + combo * 6, badge: `Letra ${letter}` }), 520);
    return () => window.clearTimeout(id);
  }, [categories.length, combo, completed, letter, onComplete]);

  return (
    <GameStage title="Stop Rush" subtitle="Cartas rápidas, letra surpresa e ritmo confortável." icon={Sparkles} combo={combo} xp={75 + combo * 6} energy={Math.min(100, 54 + completed * 9)}>
      <XPBurst amount={75 + combo * 6} show={burst} />
      <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
        <motion.div animate={{ rotate: [0, -2, 2, 0], scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="grid min-h-32 place-items-center rounded-3xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_6px_0_hsl(var(--foreground))]">
          <div className="text-center">
            <p className="text-xs font-black uppercase">letra</p>
            <p className="text-6xl font-black">{letter}</p>
          </div>
        </motion.div>
        <div className="grid gap-2">
          {categories.map((category) => (
            <div key={category.id} className="rounded-2xl border-2 border-foreground bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black uppercase text-muted-foreground">{category.label}</p>
                {answers[category.id] && <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {category.options.map((option) => (
                  <motion.button
                    key={option.label}
                    type="button"
                    onClick={() => choose(category.id, option.label, option.correct)}
                    whileTap={{ scale: 0.94 }}
                    disabled={Boolean(answers[category.id])}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-xs font-black transition",
                      answers[category.id] === option.label ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:border-primary",
                    )}
                  >
                    {answers[category.id] === option.label ? option.label : option.short}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GameStage>
  );
}

export function EssayPuzzle({ combo, onComplete, onMiss }: MiniGameProps) {
  const pieces: Piece[] = [
    { id: "intro", label: "Bauman ajuda a explicar relações instáveis.", hint: "introdução", tone: "yellow" },
    { id: "dev", label: "A escola precisa ensinar leitura crítica de mídia.", hint: "desenvolvimento", tone: "blue" },
    { id: "fim", label: "MEC e plataformas devem criar ações de educação digital.", hint: "conclusão", tone: "green" },
  ];
  const slots: Slot[] = [
    { id: "slot-intro", label: "Introdução", accepts: "intro" },
    { id: "slot-dev", label: "Desenvolvimento", accepts: "dev" },
    { id: "slot-fim", label: "Conclusão", accepts: "fim" },
  ];

  return (
    <GameStage title="Essay Builder" subtitle="Construa a redação como blocos de estratégia." icon={Flag} combo={combo} xp={64 + combo * 5} energy={90}>
      <EssayBuilder
        pieces={pieces}
        slots={slots}
        onSuccess={() => onComplete({ title: "Redação construída", description: "Você organizou repertório, argumento e proposta como uma estrutura jogável.", xp: 64 + combo * 5, badge: "Builder" })}
        onFail={() => onMiss?.("Esse bloco encaixa melhor em outra parte da estrutura.")}
      />
    </GameStage>
  );
}

export function ErrorHuntGame({ combo, onComplete, onMiss }: MiniGameProps) {
  const fragments = [
    { id: "a", text: "A leitura amplia o repertório do estudante.", error: false, x: "left-[8%] top-[18%]" },
    { id: "b", text: "Os jovens precisa de orientação crítica nas redes.", error: true, x: "left-[34%] top-[46%]" },
    { id: "c", text: "Além disso, a escola pode mediar esse processo.", error: false, x: "right-[8%] top-[22%]" },
  ];
  const [picked, setPicked] = useState<string | null>(null);
  const [hit, setHit] = useState(false);

  function choose(fragment: (typeof fragments)[number]) {
    setPicked(fragment.id);
    if (fragment.error) {
      setHit(true);
      window.setTimeout(() => onComplete({ title: "Alvo encontrado", description: "Você caçou a falha de concordância no mapa textual.", xp: 48 + combo * 4, badge: "Hunter" }), 480);
      return;
    }
    onMiss?.("Esse fragmento está limpo. Procure a carta com ruído gramatical.");
  }

  return (
    <GameStage title="Caça-Erro Hunter" subtitle="Procure o ruído gramatical no campo de cartas." icon={Search} combo={combo} xp={48 + combo * 4} energy={picked && !hit ? 58 : 92} mascotMood={picked && !hit ? "alert" : "ready"}>
      <div className="relative min-h-[320px] overflow-hidden rounded-3xl border-2 border-foreground bg-[#e9f6ff] p-4 shadow-[0_5px_0_hsl(var(--foreground))] dark:bg-card">
        <RewardExplosion active={hit} />
        <div className="absolute inset-x-6 top-1/2 h-1 rounded-full bg-secondary/20" />
        {fragments.map((fragment, index) => (
          <motion.button
            key={fragment.id}
            type="button"
            onClick={() => choose(fragment)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
            transition={{ delay: index * 0.08, y: { repeat: Infinity, duration: 2 + index * 0.3 } }}
            className={cn(
              "absolute w-[42%] rounded-2xl border-2 border-foreground bg-background p-3 text-left text-xs font-black leading-5 shadow-[0_5px_0_hsl(var(--foreground))] sm:w-[30%]",
              fragment.x,
              picked === fragment.id && fragment.error && "bg-accent text-accent-foreground",
              picked === fragment.id && !fragment.error && "bg-destructive text-destructive-foreground",
            )}
          >
            {fragment.text}
          </motion.button>
        ))}
      </div>
    </GameStage>
  );
}

export function BossChallenge({ combo, onComplete, onMiss }: MiniGameProps) {
  const [hp, setHp] = useState(100);
  const [step, setStep] = useState(0);
  const rounds = [
    {
      question: "Escolha a tese com mais impacto.",
      answers: ["Ler é importante.", "A baixa leitura reduz pensamento crítico e participação social."],
      correct: 1,
    },
    {
      question: "Escolha a intervenção mais completa.",
      answers: ["O governo deve ajudar.", "MEC e escolas devem criar clubes de leitura com metas, mediação docente e avaliação mensal."],
      correct: 1,
    },
  ];
  const current = rounds[step];

  function answer(index: number) {
    if (index !== current.correct) {
      setHp((value) => Math.max(30, value - 18));
      onMiss?.("O chefe absorveu esse golpe. Use uma carta mais específica.");
      return;
    }
    const nextHp = Math.max(0, hp - 50);
    setHp(nextHp);
    if (step < rounds.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    window.setTimeout(() => onComplete({ title: "Chefe derrotado", description: "Você venceu com tese forte e intervenção completa.", xp: 120 + combo * 8, badge: "Boss" }), 500);
  }

  return (
    <GameStage title="Boss da Argumentação" subtitle="Use cartas fortes para quebrar a defesa do desafio final." icon={Swords} combo={combo} xp={120 + combo * 8} energy={hp} mascotMood={hp <= 50 ? "happy" : "ready"}>
      <BossBattleUI hp={hp} round={step + 1} total={rounds.length} />
      <div className="rounded-3xl border-2 border-foreground bg-background p-4 shadow-[0_5px_0_hsl(var(--foreground))]">
        <p className="text-lg font-black">{current.question}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {current.answers.map((answerText, index) => (
          <InteractiveCard key={answerText} onClick={() => answer(index)} className="min-h-28">
            <p className="text-sm font-black leading-6">{answerText}</p>
            <p className="mt-3 text-xs font-bold text-muted-foreground">carta de impacto {index + 1}</p>
          </InteractiveCard>
        ))}
      </div>
    </GameStage>
  );
}

export function BossBattleUI({ hp, round, total }: { hp: number; round: number; total: number }) {
  return (
    <div className="rounded-3xl border-2 border-foreground bg-secondary p-4 text-secondary-foreground shadow-[0_5px_0_hsl(var(--foreground))]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.1 }} className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-foreground">
            <Swords className="h-6 w-6" aria-hidden="true" />
          </motion.div>
          <div>
            <p className="text-xs font-black uppercase text-secondary-foreground/70">chefe final</p>
            <p className="font-black">Guardião da Banca</p>
          </div>
        </div>
        <span className="rounded-xl bg-background/20 px-3 py-1 text-xs font-black">
          {round}/{total}
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-full border border-foreground bg-background/20">
        <motion.div className="h-full bg-destructive" animate={{ width: `${hp}%` }} transition={{ duration: 0.35 }} />
      </div>
    </div>
  );
}

export function DragDropPuzzle({
  pieces,
  slots,
  successLabel,
  onSuccess,
  onFail,
}: {
  pieces: Piece[];
  slots: Slot[];
  successLabel: string;
  onSuccess: () => void;
  onFail?: () => void;
}) {
  const [activePieceId, setActivePieceId] = useState<string | null>(null);
  const [filled, setFilled] = useState<Record<string, string>>({});
  const solved = slots.every((slot) => filled[slot.id] === slot.accepts);

  useEffect(() => {
    if (!solved) return;
    const id = window.setTimeout(onSuccess, 360);
    return () => window.clearTimeout(id);
  }, [onSuccess, solved]);

  function place(slot: Slot, pieceId?: string | null) {
    const nextPieceId = pieceId ?? activePieceId;
    if (!nextPieceId) return;
    if (nextPieceId !== slot.accepts) {
      setActivePieceId(null);
      onFail?.();
      return;
    }
    setFilled((current) => ({ ...current, [slot.id]: nextPieceId }));
    setActivePieceId(null);
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_0.85fr]">
      <div className="grid gap-2">
        <p className="text-xs font-black uppercase text-muted-foreground">peças soltas</p>
        {pieces.map((piece) => (
          <InteractiveCard
            key={piece.id}
            selected={activePieceId === piece.id}
            solved={Object.values(filled).includes(piece.id)}
            disabled={Object.values(filled).includes(piece.id)}
            draggable
            onDragStart={() => setActivePieceId(piece.id)}
            onClick={() => setActivePieceId(piece.id)}
            className={cn("min-h-16", toneClass(piece.tone))}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-black">{piece.label}</span>
              <span className="rounded-lg bg-foreground/10 px-2 py-1 text-[10px] font-black">{piece.hint}</span>
            </div>
          </InteractiveCard>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="text-xs font-black uppercase text-muted-foreground">zona de encaixe</p>
        {slots.map((slot) => {
          const piece = pieces.find((item) => item.id === filled[slot.id]);
          return (
            <motion.button
              key={slot.id}
              type="button"
              onClick={() => place(slot)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                place(slot, activePieceId);
              }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "min-h-32 rounded-3xl border-2 border-dashed border-foreground bg-background p-4 text-center shadow-[0_5px_0_hsl(var(--foreground))]",
                piece && "border-solid bg-accent text-accent-foreground",
              )}
            >
              {piece ? (
                <>
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
                  <p className="text-lg font-black">{successLabel}</p>
                  <p className="mt-1 text-sm font-bold">{piece.label}</p>
                </>
              ) : (
                <>
                  <Gem className="mx-auto mb-2 h-8 w-8 text-primary" aria-hidden="true" />
                  <p className="text-lg font-black">{slot.label}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">toque numa peça e depois aqui</p>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function EssayBuilder({
  pieces,
  slots,
  onSuccess,
  onFail,
}: {
  pieces: Piece[];
  slots: Slot[];
  onSuccess: () => void;
  onFail?: () => void;
}) {
  return <DragDropPuzzle pieces={pieces} slots={slots} successLabel="Bloco encaixado" onSuccess={onSuccess} onFail={onFail} />;
}

export function CompletionScreen({ title, description, onContinue }: { title: string; description: string; onContinue: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-foreground bg-card p-5 text-center shadow-[0_7px_0_hsl(var(--foreground))]">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border-2 border-foreground bg-accent text-accent-foreground">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button className="mt-5 w-full sm:w-auto" onClick={onContinue}>
        Próxima fase
      </Button>
    </div>
  );
}

function GameStage({
  title,
  subtitle,
  icon: Icon,
  combo,
  xp,
  energy,
  mascotMood = "ready",
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  combo: number;
  xp: number;
  energy: number;
  mascotMood?: "ready" | "happy" | "alert";
  children: ReactNode;
}) {
  return (
    <motion.section
      variants={pop}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[2rem] border-2 border-foreground bg-card p-3 shadow-[0_8px_0_hsl(var(--foreground))] md:p-4"
    >
      <RewardExplosion active={false} />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/25" />
      <div className="relative space-y-3">
        <GameHUD title={title} combo={combo} xp={xp} energy={energy} multiplier={Math.max(1, Math.floor(combo / 3) + 1)} />
        <div className="grid gap-3 lg:grid-cols-[96px_1fr]">
          <div className="hidden lg:block">
            <GameMascot mood={mascotMood} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-black">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function regionForTrack(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("gram")) return { world: "Cidade da Gramática", area: "Oficina das Regras" };
  if (normalized.includes("reda")) return { world: "Mundo da Argumentação", area: "Laboratório da Coesão" };
  return { world: "Cidade da Interpretação", area: "Arena dos Sentidos" };
}

function toneClass(tone: Piece["tone"]) {
  if (tone === "blue") return "bg-secondary text-secondary-foreground";
  if (tone === "green") return "bg-accent text-accent-foreground";
  if (tone === "red") return "bg-destructive text-destructive-foreground";
  if (tone === "dark") return "bg-foreground text-background";
  return "bg-primary text-primary-foreground";
}

function optionSet(letter: string, type: string) {
  const data: Record<string, Record<string, { label: string; short: string }[]>> = {
    B: {
      conectivo: [{ label: "Bem como", short: "Bem" }, { label: "Portanto", short: "Por" }, { label: "Logo", short: "Log" }],
      repertorio: [{ label: "Bauman", short: "Bau" }, { label: "Kant", short: "Kan" }, { label: "ONU", short: "ONU" }],
      filosofo: [{ label: "Byung-Chul Han", short: "Han" }, { label: "Aristóteles", short: "Ari" }, { label: "Locke", short: "Loc" }],
      obra: [{ label: "Black Mirror", short: "B.M." }, { label: "Vidas Secas", short: "Vid" }, { label: "1984", short: "1984" }],
      tese: [{ label: "Baixa leitura crítica", short: "BLC" }, { label: "Omissão estatal", short: "OE" }, { label: "Falta de ação", short: "FA" }],
    },
    C: {
      conectivo: [{ label: "Consequentemente", short: "Con" }, { label: "Entretanto", short: "Ent" }, { label: "Todavia", short: "Tod" }],
      repertorio: [{ label: "Cambridge Analytica", short: "Cam" }, { label: "Bauman", short: "Bau" }, { label: "Iluminismo", short: "Ilu" }],
      filosofo: [{ label: "Chomsky", short: "Cho" }, { label: "Kant", short: "Kan" }, { label: "Debord", short: "Deb" }],
      obra: [{ label: "Cidade de Deus", short: "Cid" }, { label: "Black Mirror", short: "B.M." }, { label: "Ensaio", short: "Ens" }],
      tese: [{ label: "Cidadania digital frágil", short: "CDF" }, { label: "Pouca leitura", short: "PL" }, { label: "Falha social", short: "FS" }],
    },
    M: {
      conectivo: [{ label: "Mediante isso", short: "Med" }, { label: "Porém", short: "Por" }, { label: "Assim", short: "Ass" }],
      repertorio: [{ label: "Milton Santos", short: "Mil" }, { label: "Bauman", short: "Bau" }, { label: "ONU", short: "ONU" }],
      filosofo: [{ label: "Marilena Chauí", short: "Mar" }, { label: "Locke", short: "Loc" }, { label: "Kant", short: "Kan" }],
      obra: [{ label: "Matrix", short: "Mat" }, { label: "Black Mirror", short: "B.M." }, { label: "1984", short: "1984" }],
      tese: [{ label: "Manipulação algorítmica", short: "Man" }, { label: "Omissão estatal", short: "OE" }, { label: "Falta de verba", short: "FV" }],
    },
    A: {
      conectivo: [{ label: "Além disso", short: "Além" }, { label: "Portanto", short: "Por" }, { label: "Logo", short: "Log" }],
      repertorio: [{ label: "Agenda 2030", short: "Ag." }, { label: "Bauman", short: "Bau" }, { label: "Debord", short: "Deb" }],
      filosofo: [{ label: "Aristóteles", short: "Ari" }, { label: "Kant", short: "Kan" }, { label: "Locke", short: "Loc" }],
      obra: [{ label: "A Onda", short: "Ond" }, { label: "Matrix", short: "Mat" }, { label: "1984", short: "1984" }],
      tese: [{ label: "Ausência de mediação", short: "Aus" }, { label: "Pouca leitura", short: "PL" }, { label: "Falta geral", short: "FG" }],
    },
  };
  return data[letter][type].map((item, index) => ({ ...item, correct: index === 0 }));
}
