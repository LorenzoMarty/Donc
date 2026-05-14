"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Sparkles, Trophy, Zap } from "lucide-react";

import {
  buildExerciseTracks,
  CompletionScreen,
  ExercisePlayPanel,
  ExerciseTrackTabs,
  getFirstAvailableNode,
  getTrackProgress,
  MissionCard,
  RewardModal,
  TrailMap,
  XpBar,
  type ExerciseNode,
  type ExerciseResult,
} from "@/components/app/exercise-game";
import { LoadingCard } from "@/components/app/loading-card";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Button } from "@/components/ui/button";
import { apiFetch, type Exercise } from "@/lib/api";

const completedStorageKey = "lume.exercise.completed";
const completedNodeStorageKey = "lume.exercise.completed.nodes";
const comboStorageKey = "lume.exercise.combo";

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState("interpretacao");
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, ExerciseResult>>({});
  const [combo, setCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [reward, setReward] = useState<{ xp: number; combo: number; title: string; nextLabel?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedCompleted = window.localStorage.getItem(completedNodeStorageKey);
    const savedCombo = window.localStorage.getItem(comboStorageKey);
    if (savedCompleted) {
      setCompletedNodeIds(JSON.parse(savedCompleted).map(String));
    } else {
      window.localStorage.removeItem(completedStorageKey);
    }
    if (savedCombo) setCombo(Number(savedCombo) || 0);

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
  const activeExercise = activeNode?.exercise;
  const activeResult = activeNode ? results[activeNode.id] : undefined;
  const trackProgress = activeTrack ? getTrackProgress(activeTrack) : { completed: 0, total: 0, percent: 0 };
  const totalCompleted = completedNodeIds.length;
  const currentLevel = Math.max(1, Math.floor((680 + sessionXp) / 250) + 1);

  function persistCompleted(nextCompleted: string[]) {
    setCompletedNodeIds(nextCompleted);
    window.localStorage.setItem(completedNodeStorageKey, JSON.stringify(nextCompleted));
  }

  function persistCombo(nextCombo: number) {
    setCombo(nextCombo);
    window.localStorage.setItem(comboStorageKey, String(nextCombo));
  }

  function selectTrack(trackId: string) {
    const track = tracks.find((item) => item.id === trackId);
    setActiveTrackId(trackId);
    setActiveNodeId(track ? getFirstAvailableNode(track)?.id : undefined);
  }

  function selectNode(node: ExerciseNode) {
    if (node.state === "locked" || !node.exercise) return;
    setActiveNodeId(node.id);
  }

  async function submit() {
    if (!activeExercise || !activeNode) return;
    const answer = selected[activeNode.id];
    if (!answer) return;

    const result = await apiFetch<ExerciseResult>(`/exercises/${activeExercise.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ selected_answer: answer }),
    });
    setResults((current) => ({ ...current, [activeNode.id]: result }));

    if (result.is_correct) {
      const nextCombo = combo + 1;
      const nextCompleted = completedNodeIds.includes(activeNode.id) ? completedNodeIds : [...completedNodeIds, activeNode.id];
      const updatedTrack = buildExerciseTracks(exercises, nextCompleted).find((track) => track.id === activeTrackId);
      const nextNode = updatedTrack ? getFirstAvailableNode(updatedTrack) : undefined;
      persistCompleted(nextCompleted);
      persistCombo(nextCombo);
      setSessionXp((current) => current + result.xp_earned);
      setReward({
        xp: result.xp_earned,
        combo: nextCombo,
        title: activeNode.kind === "boss" ? "Desafio final vencido" : nextCombo >= 3 ? "Combo relampago" : "Etapa liberada",
        nextLabel: nextNode ? `${nextNode.phaseTitle} - ${nextNode.label}` : "Campanha finalizada",
      });
    } else {
      persistCombo(0);
    }
  }

  function continueTrail() {
    setReward(null);
    const updatedTracks = buildExerciseTracks(exercises, completedNodeIds);
    const updatedTrack = updatedTracks.find((track) => track.id === activeTrackId);
    const nextNode = updatedTrack ? getFirstAvailableNode(updatedTrack) : undefined;
    if (nextNode) setActiveNodeId(nextNode.id);
  }

  function retryActiveNode() {
    if (!activeNode) return;
    setResults((current) => {
      const next = { ...current };
      delete next[activeNode.id];
      return next;
    });
    setSelected((current) => {
      const next = { ...current };
      delete next[activeNode.id];
      return next;
    });
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Modo jornada"
        title="Campanha de Portugues"
        description="Avance em uma trilha vertical: uma etapa por vez, XP imediato, desafio final no encerramento e desbloqueio controlado."
        action={
          <Button onClick={() => activeTrack && setActiveNodeId(getFirstAvailableNode(activeTrack)?.id)} size="lg" className="w-full md:w-auto">
            Ir para proxima missao
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <ExerciseTrackTabs tracks={tracks} activeTrackId={activeTrack?.id ?? activeTrackId} onChange={selectTrack} />
          {activeTrack && <TrailMap track={activeTrack} activeNodeId={activeNode?.id} onSelect={selectNode} />}
        </div>

        <aside className="space-y-4">
          <XpBar xp={680 + sessionXp} level={currentLevel} combo={combo} />
          <Surface>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Missoes</p>
                <h2 className="mt-1 text-xl font-black tracking-normal">Hoje</h2>
              </div>
              <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <MissionCard title="Sem errar" description="Complete 5 questoes mantendo precisao." progress={Math.min(combo, 5)} target={5} reward="+60 XP" icon="combo" />
              <MissionCard title="Finalizar campanha" description="Venca todas as etapas jogaveis ate o desafio final." progress={trackProgress.completed} target={Math.max(trackProgress.total, 1)} reward="Medalha" icon="weekly" />
              <MissionCard title="Desafio relampago" description="Responda 3 etapas nesta sessao." progress={Math.min(totalCompleted, 3)} target={3} reward="Titulo" icon="daily" />
            </div>
          </Surface>
          <Surface className="bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/12">
                <Trophy className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black">Titulo em progresso</p>
                <p className="text-xs text-white/72">{activeTrack?.titleReward ?? "Mestre ENEM"}</p>
              </div>
            </div>
          </Surface>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
        <ExercisePlayPanel
          node={activeNode}
          selectedAnswer={activeNode ? selected[activeNode.id] : undefined}
          result={activeResult}
          combo={combo}
          onSelectAnswer={(answer) => activeNode && setSelected((current) => ({ ...current, [activeNode.id]: answer }))}
          onSubmit={submit}
          onRetry={retryActiveNode}
        />

        <Surface>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Fase atual</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">{activeTrack?.title ?? "Trilha"}</h2>
            </div>
            <div className="rounded-lg bg-secondary/18 p-3 text-secondary">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow label="Progresso da trilha" value={`${trackProgress.percent}%`} />
            <InfoRow label="Nodes concluidos" value={`${trackProgress.completed}/${trackProgress.total}`} />
            <InfoRow label="Combo ativo" value={`${combo}x`} />
            <InfoRow label="XP da sessao" value={`+${sessionXp}`} />
          </div>
          <div className="mt-5 rounded-lg border bg-background/58 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-black">
              <Zap className="h-4 w-4 text-secondary" aria-hidden="true" />
              Regra de desbloqueio
            </div>
            <p className="text-sm leading-6 text-muted-foreground">Acerte a etapa disponivel para abrir a proxima. Errou? A etapa continua ativa para nova tentativa.</p>
          </div>
          {activeTrack && <CompletionScreen title={activeTrack.title} completed={trackProgress.completed} total={trackProgress.total} />}
        </Surface>
      </div>

      <RewardModal open={Boolean(reward)} xp={reward?.xp ?? 0} combo={reward?.combo ?? 0} title={reward?.title ?? "Missao"} nextLabel={reward?.nextLabel} onClose={continueTrail} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between rounded-lg border bg-background/58 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </motion.div>
  );
}
