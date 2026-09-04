"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  FileText,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  Puzzle,
  TrendingUp,
  Users,
} from "lucide-react";

import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/providers/app-providers";
import { apiFetch, type AdminMetrics } from "@/services/api";
import type {
  AdminAdaptiveHealth,
  AdminContentQuality,
  AdminLesson,
  AdminModule,
  AdminPedagogicalMetrics,
  AdminReviewer,
  AIGeneratedGame,
  AITelemetry,
  EssayTheme,
  ReviewQueueItem,
  UserActivity,
} from "@/types/api";
import { cn } from "@/utils";

import { AdaptiveHealthTab } from "./_tabs/adaptive-health";
import { AdminOverviewTab } from "./_tabs/overview";
import { AITelemetryTab } from "./_tabs/ai-telemetry";
import { ContentQualityTab } from "./_tabs/content-quality";
import { ExercisesTab } from "./_tabs/exercises";
import { PedagogicalMetricsTab } from "./_tabs/pedagogical-metrics";
import { ReviewQueueTab } from "./_tabs/review-queue";
import { UsersTab } from "./_tabs/users";
import { AIGamesTab } from "./_tabs/ai-games";
import { ModulesTab } from "./_tabs/modules";
import { ThemesTab } from "./_tabs/themes";

type AdminTab = {
  value: string;
  label: string;
  description: string;
  section: "Operação" | "Conteúdo" | "Sistema";
  icon: typeof LayoutDashboard;
};

const NAV_TABS: AdminTab[] = [
  { value: "overview", label: "Painel", description: "Prioridades, pendências e uso recente.", section: "Operação", icon: LayoutDashboard },
  { value: "review-queue", label: "Revisões", description: "Conteúdo pendente para aprovar ou rejeitar.", section: "Operação", icon: ClipboardCheck },
  { value: "users", label: "Alunos", description: "Gestão de usuários, progresso e consumo.", section: "Operação", icon: Users },
  { value: "themes", label: "Temas", description: "Temas de redação e textos motivadores.", section: "Conteúdo", icon: FileText },
  { value: "modules", label: "Módulos", description: "Aulas, módulos e ordem do curso.", section: "Conteúdo", icon: LibraryBig },
  { value: "exercises", label: "Exercícios", description: "Questões e atividades pedagógicas.", section: "Conteúdo", icon: ListChecks },
  { value: "games", label: "Jogos", description: "Banco de jogos e perguntas por engine.", section: "Conteúdo", icon: Puzzle },
  { value: "ai", label: "Custos de IA", description: "Custos, erros e consumo por fluxo.", section: "Sistema", icon: Bot },
  { value: "content-quality", label: "Qualidade", description: "Lacunas de conteúdo e cobertura adaptativa.", section: "Sistema", icon: BarChart3 },
  { value: "adaptive-health", label: "Saúde adaptativa", description: "Alertas do motor de recomendação.", section: "Sistema", icon: Gauge },
  { value: "pedagogical-metrics", label: "Eficácia", description: "O motor adaptativo está funcionando? Funil e antes/depois por problema.", section: "Sistema", icon: TrendingUp },
];

const EMPTY_TELEMETRY: AITelemetry = {
  period_days: 30,
  has_data: false,
  total_tokens: 0,
  total_calls: 0,
  error_calls: 0,
  cost_usd_cents: 0,
  cost_usd_micros: 0,
  cost_brl_cents: 0,
  usd_brl_rate: 0,
  rate_source: "",
  agents: [],
  workflows: [],
  models: [],
  daily: [],
  top_users: [],
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reviewers, setReviewers] = useState<AdminReviewer[]>([]);
  const [telemetry, setTelemetry] = useState<AITelemetry | null>(null);
  const [telemetryError, setTelemetryError] = useState("");
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [games, setGames] = useState<AIGeneratedGame[]>([]);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [contentQuality, setContentQuality] = useState<AdminContentQuality | null>(null);
  const [adaptiveHealth, setAdaptiveHealth] = useState<AdminAdaptiveHealth | null>(null);
  const [pedagogicalMetrics, setPedagogicalMetrics] = useState<AdminPedagogicalMetrics | null>(null);
  const [reviewQueueCount, setReviewQueueCount] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(() =>
    typeof window === "undefined" ? "overview" : new URLSearchParams(window.location.search).get("tab") ?? "overview",
  );

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    Promise.allSettled([
      apiFetch<AdminMetrics>("/admin/metrics"),
      apiFetch<AdminReviewer[]>("/admin/reviewers"),
      apiFetch<AITelemetry>("/admin/ai-telemetry?days=30"),
      apiFetch<UserActivity>("/admin/user-activity?days=7"),
      apiFetch<AIGeneratedGame[]>("/admin/ai-games"),
      apiFetch<AdminModule[]>("/admin/content"),
      apiFetch<EssayTheme[]>("/admin/essay-themes"),
      apiFetch<AdminContentQuality>("/admin/content-quality"),
      apiFetch<AdminAdaptiveHealth>("/admin/adaptive-health"),
      apiFetch<ReviewQueueItem[]>("/admin/review-queue"),
      apiFetch<AdminPedagogicalMetrics>("/admin/pedagogical-metrics"),
    ]).then(([m, u, t, a, g, c, th, cq, ah, rq, pm]) => {
      if (m.status === "fulfilled") setMetrics(m.value);
      else setError(m.reason instanceof Error ? m.reason.message : "Não foi possível carregar o painel administrativo.");

      if (u.status === "fulfilled") setReviewers(u.value);
      if (t.status === "fulfilled") setTelemetry(t.value);
      else {
        setTelemetry(EMPTY_TELEMETRY);
        setTelemetryError(t.reason instanceof Error ? t.reason.message : "Não foi possível carregar os custos de IA.");
      }
      if (a.status === "fulfilled") setActivity(a.value);
      if (g.status === "fulfilled") setGames(g.value);
      if (c.status === "fulfilled") setModules(c.value);
      if (th.status === "fulfilled") setThemes(th.value);
      if (cq.status === "fulfilled") setContentQuality(cq.value);
      if (ah.status === "fulfilled") setAdaptiveHealth(ah.value);
      if (rq.status === "fulfilled") setReviewQueueCount(rq.value.length);
      if (pm.status === "fulfilled") setPedagogicalMetrics(pm.value);
    });
  }, [authLoading, isAdmin]);

  if (authLoading) {
    return <LoadingCard />;
  }

  if (!isAdmin || error) {
    return <PageHeader eyebrow="Administração" title="Painel indisponível" description={!isAdmin ? "Acesso restrito a administradores." : error} />;
  }

  if (!metrics || !telemetry || !activity) {
    return <LoadingCard />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <AdminSidebar activeTab={tab} reviewQueueCount={reviewQueueCount} onChange={setTab} />

      <main className="min-w-0 space-y-4">
        <AdminTopbar activeTab={tab} metrics={metrics} activity={activity} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value="overview" className="mt-0">
            <AdminOverviewTab
              metrics={metrics}
              games={games}
              themes={themes}
              reviewQueueCount={reviewQueueCount}
              contentQuality={contentQuality}
              activity={activity}
              onOpenTab={setTab}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-0">
            <AITelemetryTab
              telemetry={telemetry}
              initialError={telemetryError}
              onPeriodChange={async (days) => {
                const t = await apiFetch<AITelemetry>(`/admin/ai-telemetry?days=${days}`);
                setTelemetry(t);
                setTelemetryError("");
              }}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UsersTab />
          </TabsContent>

          <TabsContent value="themes" className="mt-0">
            <ThemesTab
              themes={themes}
              users={reviewers}
              onUpdated={(theme) => setThemes((prev) => prev.map((item) => (item.id === theme.id ? theme : item)))}
              onDeleted={(themeId) => setThemes((prev) => prev.filter((item) => item.id !== themeId))}
              onGenerated={(theme) => setThemes((prev) => [theme, ...prev.filter((item) => item.id !== theme.id)])}
            />
          </TabsContent>

          <TabsContent value="modules" className="mt-0">
            <ModulesTab
              modules={modules}
              onModulesChanged={setModules}
              onLessonCreated={(moduleId: number, lesson: AdminLesson) =>
                setModules((prev) =>
                  prev.map((module) =>
                    module.id === moduleId
                      ? {
                          ...module,
                          lessons: [...module.lessons, lesson],
                          items: [...(module.items ?? []), { id: -lesson.id, kind: "lesson", order: lesson.order, lesson, activity: null }],
                        }
                      : module,
                  ),
                )
              }
            />
          </TabsContent>

          <TabsContent value="exercises" className="mt-0">
            <ExercisesTab modules={modules} onModulesChanged={setModules} />
          </TabsContent>

          <TabsContent value="games" className="mt-0">
            <AIGamesTab games={games} />
          </TabsContent>

          <TabsContent value="review-queue" className="mt-0">
            <ReviewQueueTab
              onOpenTab={setTab}
              onGameReviewed={(updated) => setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))}
              onExerciseReviewed={() => apiFetch<AdminModule[]>("/admin/content").then(setModules)}
              onThemeReviewed={(updated) => setThemes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
            />
          </TabsContent>

          <TabsContent value="content-quality" className="mt-0">
            {contentQuality ? <ContentQualityTab report={contentQuality} /> : <LoadingCard />}
          </TabsContent>

          <TabsContent value="adaptive-health" className="mt-0">
            {adaptiveHealth && contentQuality ? (
              <AdaptiveHealthTab
                report={adaptiveHealth}
                contentQuality={contentQuality}
                onOpenContentQuality={() => setTab("content-quality")}
              />
            ) : (
              <LoadingCard />
            )}
          </TabsContent>

          <TabsContent value="pedagogical-metrics" className="mt-0">
            {pedagogicalMetrics ? <PedagogicalMetricsTab report={pedagogicalMetrics} /> : <LoadingCard />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AdminSidebar({
  activeTab,
  reviewQueueCount,
  onChange,
}: {
  activeTab: string;
  reviewQueueCount: number;
  onChange: (tab: string) => void;
}) {
  const sections: AdminTab["section"][] = ["Operação", "Conteúdo", "Sistema"];

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-card border border-border/80 bg-card/95 p-3 shadow-soft backdrop-blur">
        <div className="mb-3 flex items-center gap-2 px-2 py-1">
          <div className="grid h-9 w-9 place-items-center rounded-control bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Admin Donc</p>
            <p className="text-xs text-muted-foreground">Painel operacional</p>
          </div>
        </div>

        <nav className="grid gap-4">
          {sections.map((section) => (
            <div key={section}>
              <p className="px-2 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">{section}</p>
              <div className="grid gap-1">
                {NAV_TABS.filter((item) => item.section === section).map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onChange(item.value)}
                      className={cn(
                        "flex min-h-10 items-center gap-2 rounded-control px-2.5 py-2 text-left text-sm transition-colors",
                        active ? "bg-foreground text-background shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                      {item.value === "review-queue" && reviewQueueCount > 0 ? (
                        <Badge variant={active ? "secondary" : "outline"} className="h-5 px-1.5 text-[0.68rem]">
                          {reviewQueueCount}
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function AdminTopbar({ activeTab, metrics, activity }: { activeTab: string; metrics: AdminMetrics; activity: UserActivity }) {
  const current = NAV_TABS.find((item) => item.value === activeTab) ?? NAV_TABS[0];
  const Icon = current.icon;

  return (
    <section className="rounded-card border border-border/80 bg-card p-4 shadow-soft md:p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administração</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">{current.label}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{current.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
          <TopbarMetric label="Alunos" value={metrics.users} />
          <TopbarMetric label="Online" value={activity.online_now} />
          <TopbarMetric label="Média" value={metrics.average_score} />
        </div>
      </div>
    </section>
  );
}

function TopbarMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control border border-border bg-background/70 px-3 py-2">
      <p className="text-[0.68rem] font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}
