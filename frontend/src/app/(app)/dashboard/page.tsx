"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock3, FileText, Flame, Gamepad2, PenLine, Sparkles, Video } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { NextActionCard } from "@/components/shared/next-action-card";
import { apiFetch, type Dashboard, type EssayTheme } from "@/services/api";
import { useAuth } from "@/providers/app-providers";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type CompetencyRow = {
  competency: string;
  label: string;
  value: number;
};

const THEME_ICONS = [Sparkles, FileText, Video];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const gameAttempts = useGameStore((state) => state.attempts);
  const gameHydrated = useGameStore((state) => state.hydrated);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const dashboardPayload = await apiFetch<Dashboard>("/dashboard");
        if (ignore) return;
        setData(dashboardPayload);
        setError("");
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Não foi possível carregar o painel.");
      }
    }

    async function loadThemes() {
      try {
        const items = await apiFetch<EssayTheme[]>("/essays/themes/generate", { method: "POST", body: JSON.stringify({}) });
        if (!ignore) setThemes(items.slice(0, 3));
      } catch {
        // temas sugeridos sao um extra do painel — sem tema, so oculta a secao
      }
    }

    loadDashboard();
    loadThemes();
    return () => {
      ignore = true;
    };
  }, []);

  const competencies = useMemo(() => buildCompetencyRows(data), [data]);

  if (error) {
    return <ErrorState title="Dados indisponíveis" description={error} />;
  }

  if (!data || !gameHydrated) {
    return <LoadingCard />;
  }

  const studentName = (user?.name ?? "Aluno").split(" ")[0];
  const average = data.essay_average || 0;
  const essaysWritten = data.essays_written ?? 0;
  const completedLessons = data.completed_lessons ?? 0;
  const isNewUser = essaysWritten === 0 && completedLessons === 0 && !data.exercises_answered && gameAttempts.length === 0;

  if (isNewUser) {
    return <OnboardingChecklist name={studentName} />;
  }
  const streak = data.streak_days ?? 0;
  const bestScore = data.best_essay_score || 0;
  const heroCopy = buildHeroCopy({ bestScore, progress: data.progress_general });
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const trend = data.trend ?? [];

  return (
    <div className="text-foreground">
      <section className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[14px] capitalize text-muted-foreground">{today}</p>
          <h1 className="font-display mt-0.5 text-[28px] font-medium leading-tight sm:text-[34px]">Olá, {studentName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-control border border-border bg-card px-3.5 py-2 text-[14px] font-semibold shadow-soft">
            <Flame className="h-4 w-4 text-streak" aria-hidden="true" />
            {streak > 0 ? `${streak} dias seguidos` : "Comece hoje sua sequência"}
          </div>
        </div>
      </section>

      <section className="mt-4">
        <NextActionCard action={data.next_action} />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="g"
          icon={Sparkles}
          label="Nota média"
          value={average ? String(average) : "--"}
          suffix="/1000"
          delta={bestScore ? `melhor nota ${bestScore}` : "envie uma redação"}
          up={average > 0}
        />
        <StatCard
          tone="b"
          icon={FileText}
          label="Redações"
          value={String(essaysWritten)}
          suffix="enviadas"
          delta={`${essaysWritten} no total`}
          up={null}
        />
        <StatCard
          tone="a"
          icon={Clock3}
          label="Sequência"
          value={String(streak)}
          suffix="dias"
          delta={streak > 0 ? "sequência ativa" : "comece hoje"}
          up={streak > 0}
        />
        <StatCard
          tone="v"
          icon={Video}
          label="Aulas"
          value={String(completedLessons)}
          suffix="assistidas"
          delta={`${data.progress_general ?? 0}% do percurso`}
          up={completedLessons > 0}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="rounded-card bg-card p-6 shadow-soft">
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Evolução das notas</h2>
            <span className="text-[13px] text-muted-foreground">últimas {trend.length} redações</span>
          </div>
          <EvolutionChart trend={trend} />
        </div>

        <div className="flex flex-col rounded-card bg-card p-6 shadow-soft">
          <h2 className="mb-4 text-[16px] font-semibold">Competências (ENEM)</h2>
          <div className="flex-1 space-y-3.5">
            {competencies.map((item) => (
              <div key={item.competency}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="font-medium text-foreground/80">{item.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{item.value}/200</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (item.value / 200) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex items-center justify-between gap-6 rounded-card bg-[hsl(var(--accent-600))] p-6 text-primary-foreground shadow-accent-lg">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/95">{heroCopy.eyebrow}</p>
            <p className="font-display mt-1.5 text-[23px] font-medium leading-snug">{heroCopy.title}</p>
            <p className="mt-1 text-[13px] text-primary-foreground/95">{heroCopy.description}</p>
          </div>
          <Link
            href="/redacao"
            className="flex h-11 shrink-0 items-center gap-2 rounded-control bg-white px-5 text-[14px] font-bold text-primary transition-colors hover:bg-white/90"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Continuar
          </Link>
        </div>

        <div className="rounded-card bg-card p-6 shadow-soft">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Temas sugeridos</h2>
            <Link href="/redacao" className="text-[13px] font-semibold text-[hsl(var(--accent-700))] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-1">
            {themes.map((theme, index) => {
              const Icon = THEME_ICONS[index % THEME_ICONS.length];
              return (
                <Link
                  key={theme.id}
                  href="/redacao"
                  className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0 hover:opacity-80"
                >
                  <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-safe truncate text-[14px] font-semibold leading-tight">{theme.title}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{theme.source}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

const ONBOARDING_STEPS = [
  { icon: PenLine, title: "Escreva sua primeira redação", description: "Escolha um tema e receba nota real por competência.", href: "/redacao" },
  { icon: Video, title: "Assista sua primeira aula", description: "Aprenda os fundamentos direto no percurso de aulas.", href: "/aulas" },
  { icon: FileText, title: "Responda seu primeiro exercício", description: "Pratique o que aprendeu nas aulas.", href: "/aulas" },
  { icon: Gamepad2, title: "Jogue seu primeiro treino", description: "Treinos curtos pra destravar competências específicas.", href: "/games" },
] as const;

function OnboardingChecklist({ name }: { name: string }) {
  return (
    <div className="text-foreground">
      <section className="pb-1">
        <h1 className="font-display text-[28px] font-medium leading-tight sm:text-[34px]">Olá, {name}</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Bem-vindo ao Donc! Complete os 4 primeiros passos pra desbloquear seu painel completo de evolução.
        </p>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {ONBOARDING_STEPS.map((step) => (
          <Link
            key={step.title}
            href={step.href}
            className="flex items-start gap-4 rounded-card bg-card p-5 shadow-soft transition-colors hover:bg-card/80"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
              <step.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight">{step.title}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{step.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function EvolutionChart({ trend }: { trend: { label: string; score: number }[] }) {
  if (trend.length < 2) {
    return <p className="text-sm text-muted-foreground">Envie mais redações para ver sua evolução aqui.</p>;
  }

  const width = 560;
  const height = 200;
  const padX = 28;
  const top = 34;
  const bottom = 168;
  const values = trend.map((point) => point.score);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1000);
  const x = (index: number) => padX + index * ((width - padX * 2) / (trend.length - 1));
  const y = (value: number) => bottom - ((value - min) / (max - min || 1)) * (bottom - top);

  const points = trend.map((point, index) => ({ x: x(index), y: y(point.score), v: point.score, label: point.label }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x} ${bottom} L${points[0].x} ${bottom} Z`;
  const delta = points[points.length - 1].v - points[0].v;

  return (
    <>
      <p className={cn("mb-3.5 text-[13px] font-semibold", delta >= 0 ? "text-[hsl(var(--accent-700))]" : "text-destructive")}>
        {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}
        {delta} pontos no período
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
        <path d={area} fill="hsl(var(--primary) / 0.12)" />
        <path d={line} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={2.5} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
              {p.v}
            </text>
            <text x={p.x} y={bottom + 18} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </>
  );
}

const STAT_TONE = {
  g: "bg-primary/12 text-primary",
  b: "bg-info-tint text-info",
  a: "bg-streak-tint text-streak",
  v: "bg-highlight-tint text-highlight",
} as const;

function StatCard({
  tone,
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  up,
}: {
  tone: keyof typeof STAT_TONE;
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  delta: string;
  up: boolean | null;
}) {
  return (
    <div className="rounded-card bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
        <span className={cn("grid h-6 w-6 place-items-center rounded-md", STAT_TONE[tone])}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[34px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {suffix ? <span className="text-[14px] text-muted-foreground">{suffix}</span> : null}
      </div>
      <p className={cn("mt-2.5 text-[12px] font-semibold", up === true ? "text-[hsl(var(--accent-700))]" : up === false ? "text-destructive" : "text-muted-foreground")}>
        {delta}
      </p>
    </div>
  );
}

function buildCompetencyRows(data: Dashboard | null): CompetencyRow[] {
  const source = data?.mastery_map?.length
    ? data.mastery_map
    : [
        { competency: "C1", label: "Norma culta", value: 0 },
        { competency: "C2", label: "Compreensão", value: 0 },
        { competency: "C3", label: "Argumentação", value: 0 },
        { competency: "C4", label: "Coesão", value: 0 },
        { competency: "C5", label: "Intervenção", value: 0 },
      ];

  return source.map((item, index) => ({
    competency: item.competency || `C${index + 1}`,
    label: normalizeCompetencyLabel(item.competency, item.label),
    value: item.value ?? 0,
  }));
}

// REQ-7 (auditoria P1-5): label vem da API — o mapa hardcoded é só fallback defensivo pra
// label vazio/ausente, não sobrescreve incondicionalmente o que o backend já manda.
function normalizeCompetencyLabel(competency: string, label: string) {
  if (label) return label;
  const fallback: Record<string, string> = {
    C1: "Norma culta",
    C2: "Compreensão",
    C3: "Argumentação",
    C4: "Coesão",
    C5: "Intervenção",
  };
  return fallback[competency] ?? label;
}

function buildHeroCopy({ bestScore, progress }: { bestScore: number; progress: number }) {
  if (bestScore) {
    return {
      eyebrow: "Continue de onde parou",
      title: "Hora de superar seu melhor.",
      description: `Sua redação mais alta chegou a ${bestScore}/1000. Escreva outra para subir as competências mais fracas.`,
    };
  }
  return {
    eyebrow: "Comece por aqui",
    title: "Comece pela primeira redação.",
    description: `Seu percurso está em ${progress}%. Escreva uma redação para receber nota por competência.`,
  };
}
