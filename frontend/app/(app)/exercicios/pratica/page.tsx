"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Focus, Lock, ShieldCheck, Zap } from "lucide-react";

import {
  buildExerciseTracks,
  ExercisePlayPanel,
  getFirstAvailableNode,
  getTrackProgress,
  RewardModal,
  type ExerciseNode,
  type ExerciseResult,
} from "@/components/app/exercise-game";
import { LoadingCard } from "@/components/app/loading-card";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Button } from "@/components/ui/button";
import { apiFetch, type Exercise } from "@/lib/api";

const legacyCompletedNodeStorageKey = "lume.exercise.completed.nodes";
const legacyComboStorageKey = "lume.exercise.combo";
const completedNodeStorageKey = "donk.exercise.completed.nodes";
const comboStorageKey = "donk.exercise.combo";

export default function ExercisePracticePage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <ExercisePracticeContent />
    </Suspense>
  );
}

function ExercisePracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTrackId = searchParams.get("track") ?? "interpretacao";
  const requestedNodeId = searchParams.get("node") ?? undefined;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>();
  const [result, setResult] = useState<ExerciseResult>();
  const [combo, setCombo] = useState(0);
  const [reward, setReward] = useState<{ xp: number; combo: number; title: string; nextLabel?: string; nextNodeId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedCompleted = window.localStorage.getItem(completedNodeStorageKey) ?? window.localStorage.getItem(legacyCompletedNodeStorageKey);
    const savedCombo = window.localStorage.getItem(comboStorageKey) ?? window.localStorage.getItem(legacyComboStorageKey);
    if (savedCompleted) {
      setCompletedNodeIds(JSON.parse(savedCompleted).map(String));
      window.localStorage.setItem(completedNodeStorageKey, savedCompleted);
      window.localStorage.removeItem(legacyCompletedNodeStorageKey);
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

  useEffect(() => {
    setSelectedAnswer(undefined);
    setResult(undefined);
    setReward(null);
  }, [requestedNodeId]);

  const tracks = useMemo(() => buildExerciseTracks(exercises, completedNodeIds), [completedNodeIds, exercises]);
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];
  const activeNode = useMemo(() => {
    if (!activeTrack) return undefined;
    const allNodes = activeTrack.phases.flatMap((phase) => phase.nodes);
    return allNodes.find((node) => node.id === requestedNodeId) ?? getFirstAvailableNode(activeTrack);
  }, [activeTrack, requestedNodeId]);
  const trackProgress = activeTrack ? getTrackProgress(activeTrack) : { completed: 0, total: 0, percent: 0 };
  const unavailable = !activeNode?.exercise || activeNode.state === "locked";

  function persistCompleted(nextCompleted: string[]) {
    setCompletedNodeIds(nextCompleted);
    window.localStorage.setItem(completedNodeStorageKey, JSON.stringify(nextCompleted));
  }

  function persistCombo(nextCombo: number) {
    setCombo(nextCombo);
    window.localStorage.setItem(comboStorageKey, String(nextCombo));
  }

  async function submit() {
    if (!activeNode?.exercise || !selectedAnswer) return;

    const response = await apiFetch<ExerciseResult>(`/exercises/${activeNode.exercise.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ selected_answer: selectedAnswer }),
    });
    setResult(response);

    if (response.is_correct) {
      const nextCombo = combo + 1;
      const nextCompleted = completedNodeIds.includes(activeNode.id) ? completedNodeIds : [...completedNodeIds, activeNode.id];
      const updatedTrack = buildExerciseTracks(exercises, nextCompleted).find((track) => track.id === activeTrackId);
      const nextNode = updatedTrack ? getFirstAvailableNode(updatedTrack) : undefined;

      persistCompleted(nextCompleted);
      persistCombo(nextCombo);
      setReward({
        xp: response.xp_earned,
        combo: nextCombo,
        title: activeNode.kind === "boss" ? "Desafio final vencido" : nextCombo >= 3 ? "Combo relampago" : "Etapa liberada",
        nextLabel: nextNode ? `${nextNode.phaseTitle} - ${nextNode.label}` : "Campanha finalizada",
        nextNodeId: nextNode?.id,
      });
    } else {
      persistCombo(0);
    }
  }

  function retry() {
    setSelectedAnswer(undefined);
    setResult(undefined);
  }

  function continueAfterReward() {
    if (reward?.nextNodeId) {
      router.push(`/exercicios/pratica?track=${activeTrackId}&node=${encodeURIComponent(reward.nextNodeId)}`);
      return;
    }
    router.push(`/exercicios?track=${activeTrackId}`);
  }

  if (loading) return <LoadingCard />;

  if (unavailable) {
    return (
      <Surface className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-2xl font-black tracking-normal">Etapa indisponivel</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Volte para a trilha e abra apenas a etapa liberada. A progressao continua controlada.</p>
        <Button className="mt-5" onClick={() => router.push(`/exercicios?track=${activeTrackId}`)}>
          Voltar para trilha
        </Button>
      </Surface>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Pratica focada"
        title={activeNode.kind === "boss" ? "Desafio final" : activeNode.label}
        description="A trilha ficou fora desta tela para reduzir distracoes. Resolva a etapa atual e siga para a proxima quando concluir."
        action={
          <Button variant="outline" onClick={() => router.push(`/exercicios?track=${activeTrackId}`)} className="w-full md:w-auto">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para trilha
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <ExercisePlayPanel
          node={activeNode}
          selectedAnswer={selectedAnswer}
          result={result}
          combo={combo}
          onSelectAnswer={setSelectedAnswer}
          onSubmit={submit}
          onRetry={retry}
        />

        <aside className="space-y-4">
          <Surface>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Contexto</p>
                <h2 className="mt-1 text-xl font-black tracking-normal">{activeTrack?.title ?? "Trilha"}</h2>
              </div>
              <div className="rounded-lg bg-secondary/18 p-3 text-secondary">
                <Focus className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <PracticeInfo label="Progresso" value={`${trackProgress.percent}%`} />
              <PracticeInfo label="Passo" value={`${activeNode.step}/${activeNode.totalSteps}`} />
              <PracticeInfo label="Combo" value={`${combo}x`} />
              <PracticeInfo label="Recompensa" value={`+${activeNode.xp} XP`} />
            </div>
          </Surface>

          <Surface className="bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/12">
                <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black">Regra de foco</p>
                <p className="text-xs leading-5 text-white/72">Uma etapa por vez. Ao acertar, a proxima abre sem mostrar a lista completa.</p>
              </div>
            </div>
          </Surface>

          <Surface>
            <div className="flex items-center gap-2 text-sm font-black">
              <Zap className="h-4 w-4 text-secondary" aria-hidden="true" />
              Desbloqueio
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Errou? Tente novamente na mesma tela. Acertou? O proximo passo fica liberado.</p>
          </Surface>
        </aside>
      </div>

      <RewardModal
        open={Boolean(reward)}
        xp={reward?.xp ?? 0}
        combo={reward?.combo ?? 0}
        title={reward?.title ?? "Etapa concluida"}
        nextLabel={reward?.nextLabel}
        actionLabel={reward?.nextNodeId ? "Proxima etapa" : "Voltar para trilha"}
        onClose={continueAfterReward}
      />
    </div>
  );
}

function PracticeInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/58 p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
