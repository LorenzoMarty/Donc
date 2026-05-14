"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles, Trophy, Zap } from "lucide-react";

import {
  buildExerciseTracks,
  CompletionScreen,
  ExerciseTrackTabs,
  getFirstAvailableNode,
  getTrackProgress,
  MissionCard,
  TrailMap,
  XpBar,
  type ExerciseNode,
} from "@/components/app/exercise-game";
import { LoadingCard } from "@/components/app/loading-card";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Button } from "@/components/ui/button";
import { apiFetch, type Exercise } from "@/lib/api";

const legacyCompletedStorageKey = "lume.exercise.completed";
const legacyCompletedNodeStorageKey = "lume.exercise.completed.nodes";
const legacyComboStorageKey = "lume.exercise.combo";
const completedNodeStorageKey = "donk.exercise.completed.nodes";
const comboStorageKey = "donk.exercise.combo";

export default function ExercisesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2">
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState(searchParams.get("track") ?? "interpretacao");
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>();
  const [combo, setCombo] = useState(0);
  const [loading, setLoading] = useState(true);

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
  const totalCompleted = completedNodeIds.length;
  const currentLevel = Math.max(1, Math.floor(680 / 250) + 1);

  function selectTrack(trackId: string) {
    const track = tracks.find((item) => item.id === trackId);
    setActiveTrackId(trackId);
    setActiveNodeId(track ? getFirstAvailableNode(track)?.id : undefined);
  }

  function selectNode(node: ExerciseNode) {
    openPractice(node);
  }

  function openPractice(node?: ExerciseNode) {
    if (!node?.exercise || node.state === "locked") return;
    router.push(`/exercicios/pratica?track=${activeTrackId}&node=${encodeURIComponent(node.id)}`);
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
          <Button onClick={() => openPractice(activeNode)} size="lg" className="w-full md:w-auto">
            Praticar etapa liberada
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
          <XpBar xp={680} level={currentLevel} combo={combo} />
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
          <Surface>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Modo foco</p>
                <h2 className="mt-1 text-xl font-black tracking-normal">Pratica separada</h2>
              </div>
              <div className="rounded-lg bg-secondary/18 p-3 text-secondary">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-3">
              <InfoRow label="Trilha atual" value={activeTrack?.title ?? "Trilha"} />
              <InfoRow label="Proxima etapa" value={activeNode?.label ?? "Finalizada"} />
              <InfoRow label="Etapas concluidas" value={`${trackProgress.completed}/${trackProgress.total}`} />
            </div>
            <Button onClick={() => openPractice(activeNode)} className="mt-4 w-full" disabled={!activeNode}>
              Abrir pratica
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
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
          {activeTrack && <CompletionScreen title={activeTrack.title} completed={trackProgress.completed} total={trackProgress.total} />}
        </aside>
      </div>
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
