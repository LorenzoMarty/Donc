"use client";

import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader } from "@/components/shared/premium-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/providers/app-providers";
import { apiFetch, type AdminMetrics } from "@/services/api";
import type { AdminContentQuality, AdminLesson, AdminModule, AdminUser, AIGeneratedGame, AITelemetry, EssayTheme, UserActivity } from "@/types/api";

import { AdminOverviewTab } from "./_tabs/overview";
import { AITelemetryTab } from "./_tabs/ai-telemetry";
import { ContentQualityTab } from "./_tabs/content-quality";
import { UsersTab } from "./_tabs/users";
import { AIGamesTab } from "./_tabs/ai-games";
import { ModulesTab } from "./_tabs/modules";
import { ThemesTab } from "./_tabs/themes";

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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [telemetry, setTelemetry] = useState<AITelemetry | null>(null);
  const [telemetryError, setTelemetryError] = useState("");
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [games, setGames] = useState<AIGeneratedGame[]>([]);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [contentQuality, setContentQuality] = useState<AdminContentQuality | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    Promise.allSettled([
      apiFetch<AdminMetrics>("/admin/metrics"),
      apiFetch<AdminUser[]>("/admin/users"),
      apiFetch<AITelemetry>("/admin/ai-telemetry?days=30"),
      apiFetch<UserActivity>("/admin/user-activity?days=7"),
      apiFetch<AIGeneratedGame[]>("/admin/ai-games"),
      apiFetch<AdminModule[]>("/admin/content"),
      apiFetch<EssayTheme[]>("/admin/essay-themes"),
      apiFetch<AdminContentQuality>("/admin/content-quality"),
    ]).then(([m, u, t, a, g, c, th, cq]) => {
      if (m.status === "fulfilled") setMetrics(m.value);
      else setError(m.reason instanceof Error ? m.reason.message : "Não foi possível carregar o painel administrativo.");

      if (u.status === "fulfilled") setUsers(u.value);
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
    });
  }, [authLoading, isAdmin]);

  if (authLoading) {
    return <LoadingCard />;
  }

  if (!isAdmin || error) {
    return <PageHeader eyebrow="Admin" title="Painel indisponível" description={!isAdmin ? "Acesso restrito a administradores." : error} />;
  }

  if (!metrics || !telemetry || !activity) {
    return <LoadingCard />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Operação e dados"
        description="Acompanhe uso da plataforma, custos de IA, alunos e conteúdo pedagógico em um só lugar."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="ai">Custos de IA</TabsTrigger>
          <TabsTrigger value="users">Alunos</TabsTrigger>
          <TabsTrigger value="themes">Temas</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="games">Jogos IA</TabsTrigger>
          <TabsTrigger value="content-quality">Qualidade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AdminOverviewTab metrics={metrics} activity={activity} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
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

        <TabsContent value="users" className="mt-4">
          <UsersTab
            users={users}
            onUserUpdated={(updated) => setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)))}
            onUserDeleted={(userId) => setUsers((prev) => prev.filter((user) => user.id !== userId))}
          />
        </TabsContent>

        <TabsContent value="themes" className="mt-4">
          <ThemesTab
            themes={themes}
            onGenerated={(theme) => setThemes((prev) => [theme, ...prev.filter((item) => item.id !== theme.id)])}
            onUpdated={(theme) => setThemes((prev) => prev.map((item) => (item.id === theme.id ? theme : item)))}
            onDeleted={(themeId) => setThemes((prev) => prev.filter((item) => item.id !== themeId))}
          />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
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

        <TabsContent value="games" className="mt-4">
          <AIGamesTab
            games={games}
            onGenerated={(game) => setGames((prev) => [game, ...prev])}
            onReviewed={(updated) => setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))}
            onDeleted={(gameId) => setGames((prev) => prev.filter((g) => g.id !== gameId))}
          />
        </TabsContent>

        <TabsContent value="content-quality" className="mt-4">
          {contentQuality ? <ContentQualityTab report={contentQuality} /> : <LoadingCard />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
