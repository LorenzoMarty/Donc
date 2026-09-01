"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, Check, FileText, Flame, Gamepad2, PenLine, Sparkles, Target, User, Video } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { FolhinhaMascot } from "@/components/shared/folhinha-mascot";
import { LoadingCard } from "@/components/shared/loading-card";
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
    return (
      <NewUserPanel
        name={studentName}
        essaysWritten={essaysWritten}
        completedLessons={completedLessons}
        gamesPlayed={gameAttempts.length}
        themes={themes}
      />
    );
  }
  const streak = data.streak_days ?? 0;
  const bestScore = data.best_essay_score || 0;
  const heroCopy = buildHeroCopy({ bestScore, progress: data.progress_general });
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const trend = data.trend ?? [];

  const weakest = findWeakestCompetency(competencies);
  const draftEssay = data.recent_essays?.find((essay) => essay.status === "draft") ?? null;
  const recentCorrected = (data.recent_essays ?? []).filter((essay) => essay.score != null).slice(0, 4);

  return (
    <div className="text-foreground">
      <section className="flex flex-col gap-4 pb-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-1.5">
          <FolhinhaMascot mood="happy" size={84} message="Bom te ver de novo! Vamos terminar aquele rascunho?" side="right" />
          <div className="ml-1.5">
            <p className="text-sm capitalize text-muted-foreground">{today}</p>
            <h1 className="page-title font-display mt-0.5 font-medium">Olá, {studentName}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2 rounded-control border border-border bg-card px-3.5 py-2 text-sm font-semibold shadow-soft">
            <Flame className="h-4 w-4 text-streak" aria-hidden="true" />
            {streak > 0 ? `${streak} dias seguidos` : "Comece hoje sua sequência"}
          </div>
          <button
            type="button"
            aria-label="Notificações"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="mt-4 flex flex-wrap gap-4">
        {draftEssay ? (
          <ContinueWritingCard essay={draftEssay} />
        ) : (
          <div className="comfortable-card flex min-w-0 flex-1 basis-[340px] flex-col justify-between gap-4 rounded-card bg-primary text-primary-foreground shadow-accent sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 basis-[220px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-primary-foreground/85">{heroCopy.eyebrow}</p>
              <p className="font-display mt-2 text-[22px] font-medium leading-tight">{heroCopy.title}</p>
              <p className="mt-1 text-[13px] text-primary-foreground/85">{heroCopy.description}</p>
            </div>
            <Link
              href="/redacao"
              className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-control bg-white px-[22px] py-3 text-sm font-bold text-primary sm:w-auto"
            >
              Escrever agora
              <PenLine className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        <WeakPointCard weakest={weakest} />
      </section>

      <section className="mt-4">
        <MetricStrip
          items={[
            { icon: Sparkles, tone: "g", label: "Nota média", value: average ? String(average) : "--", unit: "/1000", delta: bestScore ? `melhor nota ${bestScore}` : "envie uma redação", up: average > 0 },
            { icon: FileText, tone: "b", label: "Redações", value: String(essaysWritten), unit: "enviadas", delta: `${essaysWritten} no total`, up: null },
            { icon: Flame, tone: "a", label: "Sequência", value: String(streak), unit: "dias", delta: streak > 0 ? "sequência ativa" : "comece hoje", up: streak > 0 },
            { icon: Video, tone: "v", label: "Aulas", value: String(completedLessons), unit: "assistidas", delta: `${data.progress_general ?? 0}% do percurso`, up: completedLessons > 0 },
          ]}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="comfortable-card rounded-card bg-card shadow-soft">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title font-semibold">Evolução das notas</h2>
            <span className="text-[13px] text-muted-foreground">últimas {trend.length} redações</span>
          </div>
          <EvolutionChart trend={trend} />
        </div>

        <div className="comfortable-card flex flex-col rounded-card bg-card shadow-soft">
          <h2 className="section-title mb-4 font-semibold">Competências (ENEM)</h2>
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
        <div className="comfortable-card rounded-card bg-card shadow-soft">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title font-semibold">Temas sugeridos</h2>
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

        <div className="comfortable-card rounded-card bg-card shadow-soft">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title font-semibold">Últimas correções</h2>
            <Link href="/redacoes" className="text-[13px] font-semibold text-[hsl(var(--accent-700))] hover:underline">
              Ver todas
            </Link>
          </div>
          {recentCorrected.length ? (
            <div>
              {recentCorrected.map((essay) => (
                <Link
                  key={essay.id}
                  href={`/redacoes/${essay.id}`}
                  className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0 hover:opacity-80"
                >
                  <div
                    className={cn(
                      "grid h-10 w-[46px] shrink-0 place-items-center rounded-control text-[15px] font-bold tabular-nums",
                      (essay.score ?? 0) >= 900 ? "bg-primary/12 text-primary" : "bg-muted text-foreground/70",
                    )}
                  >
                    {essay.score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-safe truncate text-[13px] font-semibold leading-tight">{essay.title || essay.theme_title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{formatShortDate(essay.updated_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Suas redações corrigidas aparecem aqui.</p>
          )}
        </div>
      </section>
    </div>
  );
}

type NewUserStep = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

/** Painel do usuário novo (`Painel Novo.dc.html`) — substitui o checklist genérico anterior por
 * um estado vazio real: hero de boas-vindas com CTA pra primeira redação, checklist com estado
 * derivado de dados reais (não presume conclusão), e cards vazios de evolução/competências. */
function NewUserPanel({
  name,
  essaysWritten,
  completedLessons,
  gamesPlayed,
  themes,
}: {
  name: string;
  essaysWritten: number;
  completedLessons: number;
  gamesPlayed: number;
  themes: EssayTheme[];
}) {
  const [profileDone, setProfileDone] = useState(false);

  useEffect(() => {
    let ignore = false;
    apiFetch<{ completed: boolean }>("/auth/onboarding")
      .then((profile) => {
        if (!ignore) setProfileDone(Boolean(profile.completed));
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const steps: NewUserStep[] = [
    { icon: User, title: "Complete seu perfil", description: "Conte sua meta e nível pra personalizarmos seu percurso.", href: "/perfil", done: profileDone },
    { icon: PenLine, title: "Escreva sua primeira redação", description: "Escolha um tema e receba nota real por competência.", href: "/redacao", done: essaysWritten > 0 },
    { icon: Video, title: "Assista sua primeira aula", description: "Aprenda os fundamentos direto no percurso de aulas.", href: "/aulas", done: completedLessons > 0 },
    { icon: Gamepad2, title: "Jogue seu primeiro treino", description: "Treinos curtos pra destravar competências específicas.", href: "/games", done: gamesPlayed > 0 },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className="text-foreground">
      <section className="pb-1">
        <h1 className="page-title font-display font-medium">Boas-vindas ao Donc, {name}</h1>
        <p className="page-description mt-1.5 text-muted-foreground">Seu percurso de redação começa aqui. Vamos pelos primeiros passos.</p>
      </section>

      <section className="comfortable-card mt-4 flex flex-col gap-5 rounded-card bg-[hsl(var(--accent-900))] text-white shadow-accent-lg sm:flex-row sm:items-center">
        <FolhinhaMascot mood="write" size={124} message="Escrevo junto com você!" side="left" onDark />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-medium leading-tight">Comece pela sua primeira redação</p>
          <p className="mt-1.5 text-[13px] text-white/75">Escolha um tema, escreva e receba nota por competência ENEM.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/redacao" className="flex min-h-11 items-center justify-center gap-2 rounded-control bg-white px-[22px] py-3 text-sm font-bold text-[hsl(var(--accent-900))]">
              Escolher tema
              <PenLine className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="text-[12px] text-white/60">~30 min · sua 1ª correção é grátis</span>
          </div>
        </div>
      </section>

      <section className="comfortable-card mt-4 rounded-card bg-card shadow-soft">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="section-title font-semibold">Primeiros passos</h2>
          <span className="text-[13px] font-semibold text-muted-foreground">{doneCount}/{steps.length}</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className={cn(
                "flex items-start gap-4 rounded-control border p-4 transition-colors",
                step.done ? "border-primary/20 bg-primary/5" : "border-border/70 hover:bg-card/80",
              )}
            >
              <div
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-control",
                  step.done ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary",
                )}
              >
                {step.done ? <Check className="h-5 w-5" aria-hidden="true" /> : <step.icon className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight">{step.title}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{step.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="comfortable-card rounded-card bg-card shadow-soft">
          <h2 className="section-title mb-3.5 font-semibold">Sua evolução</h2>
          <svg viewBox="0 0 560 160" className="w-full" style={{ height: 160 }} aria-hidden="true">
            <path
              d="M28 120 L150 90 L280 105 L410 60 L532 40"
              fill="none"
              stroke="hsl(var(--muted-foreground) / 0.35)"
              strokeWidth={2}
              strokeDasharray="6 8"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-[13px] text-muted-foreground">Sua primeira redação corrigida desenha o gráfico aqui.</p>
        </div>

        <div className="comfortable-card flex flex-col rounded-card bg-card shadow-soft">
          <h2 className="section-title mb-4 font-semibold">Competências (ENEM)</h2>
          <div className="flex-1 space-y-3.5">
            {["C1 · Norma culta", "C2 · Compreensão", "C3 · Argumentação", "C4 · Coesão", "C5 · Intervenção"].map((label) => (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="font-medium text-foreground/80">{label}</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">—</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {themes.length ? (
        <section className="comfortable-card mt-4 rounded-card bg-card shadow-soft">
          <h2 className="section-title mb-3.5 font-semibold">Temas para sua primeira redação</h2>
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
        </section>
      ) : null}
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

const METRIC_TONE = {
  g: "text-primary",
  b: "text-info",
  a: "text-streak",
  v: "text-highlight",
} as const;

type MetricItem = {
  icon: LucideIcon;
  tone: keyof typeof METRIC_TONE;
  label: string;
  value: string;
  unit: string;
  delta: string;
  up: boolean | null;
};

/** "Métrica em faixa" — DESIGN_SYSTEM.md §7: células irmãs num card único, divididas por
 * border-right (não cards separados). Fiel ao bloco de stats do Painel.dc.html. */
function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid rounded-card bg-card p-1 shadow-soft sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn("min-w-0 p-4", index < items.length - 1 && "border-border/70 xl:border-r", index < 2 && "sm:border-b xl:border-b-0")}
        >
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <item.icon className={cn("h-3.5 w-3.5", METRIC_TONE[item.tone])} aria-hidden="true" />
            {item.label}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{item.value}</span>
            <span className="text-[13px] text-muted-foreground">{item.unit}</span>
          </div>
          <p className={cn("mt-2 text-[12px] font-semibold", item.up === true ? "text-[hsl(var(--accent-700))]" : item.up === false ? "text-destructive" : "text-muted-foreground")}>
            {item.delta}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Card "Continue de onde parou" — redação em rascunho mais recente (Painel.dc.html). Progresso é
 * uma estimativa por contagem de palavras (não há "linhas" na API) contra ~300 palavras, tamanho
 * típico de uma redação ENEM completa — só pra dar noção de avanço, não uma métrica exata. */
function ContinueWritingCard({ essay }: { essay: NonNullable<Dashboard["recent_essays"]>[number] }) {
  const progressPercent = Math.min(100, Math.round((essay.word_count / 300) * 100));
  return (
    <div className="comfortable-card flex min-w-0 flex-1 basis-[340px] flex-col justify-between gap-4 rounded-card bg-primary text-primary-foreground shadow-accent sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 basis-[220px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-primary-foreground/85">Continue de onde parou</p>
        <p className="font-display mt-2 text-[22px] font-medium leading-tight">{essay.title || essay.theme_title}</p>
        <div className="mt-2.5 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-white/28">
          <div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-primary-foreground/85">Rascunho · {essay.word_count} palavras escritas</p>
      </div>
      <Link
        href={`/redacao?essay=${essay.id}`}
        className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-control bg-white px-[22px] py-3 text-sm font-bold text-primary sm:w-auto"
      >
        Continuar escrevendo
        <PenLine className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Card "Seu ponto fraco agora" — competência mais fraca do mastery_map (Painel.dc.html). */
function WeakPointCard({ weakest }: { weakest: CompetencyRow | null }) {
  if (!weakest) return null;
  return (
    <Link
      href="/games"
      className="comfortable-card flex min-w-0 flex-1 basis-[260px] flex-col justify-center rounded-card border border-primary/20 bg-card shadow-soft"
    >
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.05em] text-primary">
        <Target className="h-[14px] w-[14px]" aria-hidden="true" />
        Seu ponto fraco agora
      </div>
      <p className="mt-2.5 text-[19px] font-semibold leading-tight">
        {weakest.competency} · {weakest.label}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        Média {weakest.value}/200 — a menor entre as competências.
      </p>
      <p className="mt-3.5 flex items-center gap-1.5 text-[13px] font-bold text-primary">
        Treinar
        <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
      </p>
    </Link>
  );
}

function findWeakestCompetency(competencies: CompetencyRow[]): CompetencyRow | null {
  if (!competencies.length) return null;
  return competencies.reduce((weakest, item) => (item.value < weakest.value ? item : weakest));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
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
