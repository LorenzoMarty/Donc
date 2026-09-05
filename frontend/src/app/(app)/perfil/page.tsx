"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Clock, FileText, GraduationCap, Sparkles } from "lucide-react";

import { AccentSettings } from "@/app/(app)/perfil/components/accent-settings";
import { AppearanceSettings } from "@/app/(app)/perfil/components/appearance-settings";
import { AccountCard } from "@/app/(app)/perfil/components/account-card";
import { CognitiveIssuesSection } from "@/app/(app)/perfil/components/cognitive-issues-section";
import { PhaseMapCard } from "@/app/(app)/perfil/components/phase-map";
import { SubscriptionCard } from "@/app/(app)/perfil/components/subscription-card";
import { WriterXraySection } from "@/app/(app)/perfil/components/writer-xray";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { buildWriterXray, type WriterXray } from "@/features/profile/writer-xray";
import { apiFetch, type Dashboard, type EssayHistory, type LearningProfile } from "@/services/api";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

export default function ProfilePage() {
  const gameProgress = useGameStore((state) => state.progress);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [essayHistory, setEssayHistory] = useState<EssayHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiFetch<Dashboard>("/dashboard").catch(() => null),
      apiFetch<LearningProfile>("/ai/learning-profile").catch(() => null),
      apiFetch<EssayHistory>("/essays/history").catch(() => null),
    ]).then(([dash, profile, history]) => {
      if (ignore) return;
      setDashboard(dash);
      setLearningProfile(profile);
      setEssayHistory(history);
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const xray = useMemo<WriterXray | null>(
    () => (loading ? null : buildWriterXray({ dashboard, learningProfile, essayHistory })),
    [loading, dashboard, learningProfile, essayHistory],
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Perfil"
        title="Seu perfil de escritor"
        description="Veja onde sua escrita está forte, onde perde nota e o que treinar a seguir."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacoes">
              Ver histórico
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <AccountCard />

        <div className="fluid-grid gap-4 [--grid-min:13rem]">
          <Metric tone="g" icon={Sparkles} label="Nota média" value={String(dashboard?.essay_average ?? 0)} />
          <Metric tone="v" icon={FileText} label="Redações enviadas" value={String(dashboard?.essays_written ?? 0)} />
          <Metric tone="a" icon={Clock} label="Tempo de estudo" value="—" />
          <Metric tone="g" icon={GraduationCap} label="Aulas assistidas" value={String(dashboard?.completed_lessons ?? 0)} />
        </div>
      </section>

      <SubscriptionCard />

      <CognitiveIssuesSection issues={learningProfile?.cognitive_issues} />

      <WriterXraySection xray={xray} loading={loading} />

      <section className="grid gap-4 xl:grid-cols-2">
        <PhaseMapCard progress={gameProgress} />
        <AppearanceSettings />
      </section>

      <AccentSettings />
    </div>
  );
}

const METRIC_TONE = {
  g: "bg-primary/12 text-primary",
  a: "bg-streak-tint text-streak",
  v: "bg-highlight-tint text-highlight",
} as const;

function Metric({
  tone,
  icon: Icon,
  label,
  value,
}: {
  tone: keyof typeof METRIC_TONE;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Surface>
      <div className={cn("mb-4 grid h-10 w-10 place-items-center rounded-control", METRIC_TONE[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal tabular-nums">{value}</p>
    </Surface>
  );
}
