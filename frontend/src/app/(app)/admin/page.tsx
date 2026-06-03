"use client";

import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/shared/loading-card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type AdminMetrics } from "@/services/api";
import type { AdminCourse, AdminLesson, AdminModule, AdminUser, AIGeneratedGame, AITelemetry, EssayTheme, UserActivity } from "@/types/api";

import { AdminOverviewTab } from "./_tabs/overview";
import { AITelemetryTab } from "./_tabs/ai-telemetry";
import { UsersTab } from "./_tabs/users";
import { AIGamesTab } from "./_tabs/ai-games";
import { CoursesTab } from "./_tabs/courses";
import { ThemesTab } from "./_tabs/themes";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [telemetry, setTelemetry] = useState<AITelemetry | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [games, setGames] = useState<AIGeneratedGame[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      apiFetch<AdminMetrics>("/admin/metrics"),
      apiFetch<AdminUser[]>("/admin/users"),
      apiFetch<AITelemetry>("/admin/ai-telemetry?days=30"),
      apiFetch<UserActivity>("/admin/user-activity?days=7"),
      apiFetch<AIGeneratedGame[]>("/admin/ai-games"),
      apiFetch<AdminCourse[]>("/admin/content"),
      apiFetch<EssayTheme[]>("/admin/essay-themes"),
    ])
      .then(([m, u, t, a, g, c, th]) => {
        setMetrics(m);
        setUsers(u);
        setTelemetry(t);
        setActivity(a);
        setGames(g);
        setCourses(c);
        setThemes(th);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Acesso indisponível."));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border p-6 md:p-8">
        <Badge variant="outline">Admin</Badge>
        <h1 className="mt-3 text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!metrics || !telemetry || !activity) {
    return <LoadingCard />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Painel administrativo</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal md:text-4xl">Operação e dados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Métricas, telemetria de IA, usuários e geração de conteúdo.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="ai">Telemetria IA</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="themes">Temas</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="games">Jogos IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AdminOverviewTab metrics={metrics} activity={activity} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AITelemetryTab
            telemetry={telemetry}
            onPeriodChange={async (days) => {
              const t = await apiFetch<AITelemetry>(`/admin/ai-telemetry?days=${days}`);
              setTelemetry(t);
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
          <ThemesTab themes={themes} onGenerated={(theme) => setThemes((prev) => [theme, ...prev.filter((item) => item.id !== theme.id)])} />
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <CoursesTab
            courses={courses}
            onCourseCreated={(course: AdminCourse) => setCourses((prev) => [...prev, course])}
            onModuleCreated={(courseId: number, module: AdminModule) =>
              setCourses((prev) =>
                prev.map((course) => (course.id === courseId ? { ...course, modules: [...course.modules, module] } : course)),
              )
            }
            onLessonCreated={(moduleId: number, lesson: AdminLesson) =>
              setCourses((prev) =>
                prev.map((course) => ({
                  ...course,
                  modules: course.modules.map((module) =>
                    module.id === moduleId ? { ...module, lessons: [...module.lessons, lesson] } : module,
                  ),
                })),
              )
            }
          />
        </TabsContent>

        <TabsContent value="games" className="mt-4">
          <AIGamesTab
            games={games}
            onGenerated={(game) => setGames((prev) => [game, ...prev])}
            onReviewed={(updated) => setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
