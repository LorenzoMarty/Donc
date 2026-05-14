"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Gamepad2, Sparkles, Target, Trophy } from "lucide-react";

import { buildExerciseTracks, getFirstAvailableNode, getTrackProgress, type ExerciseNode } from "@/components/game/exercise-game";
import {
  BossChallenge,
  ComboSystem,
  ConnectiveChallenge,
  ErrorHuntGame,
  EssayPuzzle,
  ProgressPath,
  QuickQuiz,
  RewardPopup,
  StopGame,
  StreakCard,
  XPBar,
  type GameReward,
} from "@/components/game/quick-games";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { apiFetch, type Exercise } from "@/services/api";

const legacyCompletedStorageKey = "lume.exercise.completed";
const legacyCompletedNodeStorageKey = "lume.exercise.completed.nodes";
const legacyComboStorageKey = "lume.exercise.combo";
const completedNodeStorageKey = "donk.exercise.completed.nodes";
const comboStorageKey = "donk.exercise.combo";

type ExerciseResult = {
  is_correct: boolean;
  explanation: string;
};

export default function ExercisesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-3 md:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      }
    >
      <ExercisesContent />
    </Suspense>
  );
}

function ExercisesContent() {
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState(searchParams.get("track") ?? "interpretacao");
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>();
  const [combo, setCombo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);
  const [queuedNodeId, setQueuedNodeId] = useState<string | undefined>();

  useEffect(() => {
    const savedCompleted = window.localStorage.getItem(completedNodeStorageKey) ?? window.localStorage.getItem(legacyCompletedNodeStorageKey);
    const savedCombo = window.localStorage.getItem(comboStorageKey) ?? window.localStorage.getItem(legacyComboStorageKey);

    if (savedCompleted) {
      setCompletedNodeIds(JSON.parse(savedCompleted).map(String));
      window.localStorage.setItem(completedNodeStorageKey, savedCompleted);
      window.localStorage.removeItem(legacyCompletedNodeStorageKey);
    } else {
      window.localStorage.removeItem(legacyCompletedStorageKey);
    }

    if (savedCombo) {
      setCombo(Number(savedCombo) || 0);
      window.localStorage.setItem(comboStorageKey, savedCombo);
      window.localStorage.removeItem(legacyComboStorageKey);
    }

    apiFetch<Exercise[]>("/exercises")
      .then(setExercises)
      .finally(() => setLoading(false));
  }, []);

  const tracks = useMemo(() => buildExerciseTracks(exercises, completedNodeIds), [completedNodeIds, exercises]);
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];
  const activeNode = useMemo(() => {
    if (!activeTrack) return undefined;
    return activeTrack.phases.flatMap((phase) => phase.nodes).find((node) => node.id === activeNodeId) ?? getFirstAvailableNode(activeTrack);
  }, [activeNodeId, activeTrack]);
  const trackProgress = activeTrack ? getTrackProgress(activeTrack) : { completed: 0, total: 0, percent: 0 };
  const xp = 680 + completedNodeIds.length * 55 + combo * 8;
  const currentLevel = Math.max(1, Math.floor(xp / 350) + 1);

  useEffect(() => {
    if (!activeTrack) return;
    setActiveNodeId((current) => current ?? getFirstAvailableNode(activeTrack)?.id);
  }, [activeTrack]);

  function selectTrack(trackId: string) {
    const track = tracks.find((item) => item.id === trackId);
    setFeedback(null);
    setActiveTrackId(trackId);
    setActiveNodeId(track ? getFirstAvailableNode(track)?.id : undefined);
  }

  function selectNode(node: ExerciseNode) {
    if (node.state === "locked") return;
    setFeedback(null);
    setActiveNodeId(node.id);
  }

  function handleMiss(message: string) {
    setCombo(0);
    window.localStorage.setItem(comboStorageKey, "0");
    setFeedback(message);
  }

  function handleComplete(gameReward: GameReward) {
    if (!activeTrack || !activeNode) return;
    const nextCompleted = completedNodeIds.includes(activeNode.id) ? completedNodeIds : [...completedNodeIds, activeNode.id];
    const nextCombo = combo + 1;
    const updatedTracks = buildExerciseTracks(exercises, nextCompleted);
    const updatedTrack = updatedTracks.find((track) => track.id === activeTrack.id);
    const nextNode = updatedTrack ? getFirstAvailableNode(updatedTrack) : undefined;

    setCompletedNodeIds(nextCompleted);
    setCombo(nextCombo);
    setQueuedNodeId(nextNode?.id);
    setFeedback(null);
    setReward({
      ...gameReward,
      nextLabel: nextNode ? "Próxima fase" : "Ver progresso",
    });
    window.localStorage.setItem(completedNodeStorageKey, JSON.stringify(nextCompleted));
    window.localStorage.setItem(comboStorageKey, String(nextCombo));
  }

  function continueFlow() {
    setReward(null);
    if (queuedNodeId) {
      setActiveNodeId(queuedNodeId);
      return;
    }
    const nextTrack = tracks.find((track) => track.id !== activeTrackId && getFirstAvailableNode(track));
    if (nextTrack) {
      setActiveTrackId(nextTrack.id);
      setActiveNodeId(getFirstAvailableNode(nextTrack)?.id);
    }
  }

  async function submitQuizAnswer(option: string) {
    if (!activeNode?.exercise) return { correct: option.startsWith("A") };
    try {
      const response = await apiFetch<ExerciseResult>(`/exercises/${activeNode.exercise.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ selected_answer: option.slice(0, 1) }),
      });
      return { correct: response.is_correct, explanation: response.explanation };
    } catch {
      return { correct: option.startsWith("A"), explanation: "Não consegui validar no servidor agora. Mantive a prática local para você continuar." };
    }
  }

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const completedAll = Boolean(activeTrack && !activeNode && trackProgress.total > 0);

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        eyebrow="Jogos rápidos"
        title="Prática contínua"
        description="Entre em uma fase, ganhe XP e avance para a próxima sem perder o ritmo. A trilha controla o caminho para manter foco total."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-3">
          <TrackPicker tracks={tracks.map((track) => ({ id: track.id, title: formatTrackTitle(track.title), progress: getTrackProgress(track).percent }))} activeTrackId={activeTrack?.id ?? activeTrackId} onChange={selectTrack} />

          {activeTrack && (
            <ProgressPath track={{ ...activeTrack, title: formatTrackTitle(activeTrack.title) }} activeNodeId={activeNode?.id} completedNodeIds={completedNodeIds} onSelect={selectNode} />
          )}

          {feedback && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="game-tile bg-destructive/10 p-3 text-sm font-bold text-destructive">
              {feedback}
            </motion.div>
          )}

          {completedAll ? (
            <Surface className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent text-accent-foreground">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-black">Trilha concluída</h2>
              <p className="mt-2 text-sm text-muted-foreground">Você fechou todas as fases desta campanha. Escolha outra trilha para continuar evoluindo.</p>
            </Surface>
          ) : (
            <ActiveGame node={activeNode} combo={combo} onComplete={handleComplete} onMiss={handleMiss} onSubmitQuizAnswer={submitQuizAnswer} />
          )}
        </main>

        <aside className="space-y-3">
          <XPBar xp={xp % 1000} level={currentLevel} nextXp={1000} />
          <ComboSystem combo={combo} />
          <StreakCard streak={7} />
          <Surface>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Missões de hoje</p>
                <h2 className="mt-1 text-lg font-black">Ganhe ritmo</h2>
              </div>
              <Target className="h-5 w-5 text-secondary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <MissionRow label="3 fases seguidas" value={Math.min(combo, 3)} total={3} />
              <MissionRow label="Fechar trilha" value={trackProgress.completed} total={Math.max(trackProgress.total, 1)} />
              <MissionRow label="Combo perfeito" value={Math.min(combo, 5)} total={5} />
            </div>
          </Surface>
          <Surface className="bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-foreground bg-foreground/10">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black">Título em progresso</p>
                <p className="text-xs text-foreground/72">{activeTrack?.titleReward ? formatTrackTitle(activeTrack.titleReward) : "Mestre ENEM"}</p>
              </div>
            </div>
          </Surface>
        </aside>
      </div>

      <RewardPopup reward={reward} onContinue={continueFlow} />
    </div>
  );
}

function ActiveGame({
  node,
  combo,
  onComplete,
  onMiss,
  onSubmitQuizAnswer,
}: {
  node?: ExerciseNode;
  combo: number;
  onComplete: (reward: GameReward) => void;
  onMiss: (message: string) => void;
  onSubmitQuizAnswer: (option: string) => Promise<{ correct: boolean; explanation?: string }>;
}) {
  if (!node) {
    return (
      <Surface>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-black">Nenhuma fase liberada</h2>
            <p className="text-sm text-muted-foreground">Carregue os exercícios ou escolha outra trilha para continuar.</p>
          </div>
        </div>
      </Surface>
    );
  }

  if (node.kind === "boss") return <BossChallenge exercise={node.exercise} combo={combo} onComplete={onComplete} onMiss={onMiss} />;
  if (node.kind === "checkpoint") return <StopGame exercise={node.exercise} combo={combo} onComplete={onComplete} onMiss={onMiss} />;
  if (node.kind === "review") return <EssayPuzzle exercise={node.exercise} combo={combo} onComplete={onComplete} onMiss={onMiss} />;
  if (node.kind === "challenge") return <ConnectiveChallenge exercise={node.exercise} combo={combo} onComplete={onComplete} onMiss={onMiss} />;
  if (node.step % 3 === 0) return <ErrorHuntGame exercise={node.exercise} combo={combo} onComplete={onComplete} onMiss={onMiss} />;
  return <QuickQuiz exercise={node.exercise} combo={combo} onComplete={onComplete} onMiss={onMiss} onSubmitAnswer={onSubmitQuizAnswer} />;
}

function TrackPicker({
  tracks,
  activeTrackId,
  onChange,
}: {
  tracks: { id: string; title: string; progress: number }[];
  activeTrackId: string;
  onChange: (trackId: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {tracks.map((track) => (
        <button
          key={track.id}
          type="button"
          onClick={() => onChange(track.id)}
          className={`game-tile min-w-[180px] p-3 text-left transition ${
            track.id === activeTrackId ? "bg-primary text-primary-foreground" : "bg-card hover:bg-primary/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-black">{track.title}</span>
            <Gamepad2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          </div>
          <div className="mt-2 h-2 rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${track.progress}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function MissionRow({ label, value, total }: { label: string; value: number; total: number }) {
  const progress = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="game-tile bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs font-black text-muted-foreground">
          {value}/{total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function formatTrackTitle(value: string) {
  return value
    .replaceAll("Interpretacao", "Interpretação")
    .replaceAll("Gramatica", "Gramática")
    .replaceAll("Redacao", "Redação")
    .replaceAll("Argumentacao", "Argumentação");
}
