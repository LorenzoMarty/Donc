"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Flame, GraduationCap, Medal, Zap } from "lucide-react";

import { AppearanceSettings } from "@/app/(app)/perfil/components/appearance-settings";
import { AccountCard } from "@/app/(app)/perfil/components/account-card";
import { HubMastery } from "@/app/(app)/perfil/components/hub-mastery";
import { WriterXraySection } from "@/app/(app)/perfil/components/writer-xray";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildWriterXray, type WriterXray } from "@/features/profile/writer-xray";
import { getRankSnapshot } from "@/features/xp/xp";
import { useAuth } from "@/providers/app-providers";
import { apiFetch, type Dashboard, type EssayHistory, type LearningProfile } from "@/services/api";
import { cn } from "@/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const xp = user?.xp ?? 0;
  const rank = getRankSnapshot(xp);

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
          <Metric tone="g" icon={Zap} label="Pontos" value={String(xp)} />
          <Metric tone="v" icon={GraduationCap} label="Rank" value={rank.current.name} />
          <Metric tone="a" icon={Flame} label="Sequência" value={`${user?.streak_days ?? 0} dias`} />
        </div>
      </section>

      <Surface>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Próximo rank</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Seu progresso de rank</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {rank.next ? `${rank.xpToNext} XP até ${rank.next.name}` : "Rank máximo alcançado"}
            </p>
          </div>
          <Medal className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        </div>
        <Progress value={rank.progress} className="h-3" />
      </Surface>

      <WriterXraySection xray={xray} loading={loading} />

      <HubMastery />

      <AppearanceSettings />
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
