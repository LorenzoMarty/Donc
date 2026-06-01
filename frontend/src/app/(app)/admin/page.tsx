"use client";

import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/shared/loading-card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type AdminMetrics } from "@/services/api";
import type { AdminUser, AIGeneratedGame, AITelemetry, UserActivity } from "@/types/api";

import { AdminOverviewTab } from "./_tabs/overview";
import { AITelemetryTab } from "./_tabs/ai-telemetry";
import { UsersTab } from "./_tabs/users";
import { AIGamesTab } from "./_tabs/ai-games";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [telemetry, setTelemetry] = useState<AITelemetry | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [games, setGames] = useState<AIGeneratedGame[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      apiFetch<AdminMetrics>("/admin/metrics"),
      apiFetch<AdminUser[]>("/admin/users"),
      apiFetch<AITelemetry>("/admin/ai-telemetry?days=30"),
      apiFetch<UserActivity>("/admin/user-activity?days=7"),
      apiFetch<AIGeneratedGame[]>("/admin/ai-games"),
    ])
      .then(([m, u, t, a, g]) => {
        setMetrics(m);
        setUsers(u);
        setTelemetry(t);
        setActivity(a);
        setGames(g);
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
          <UsersTab users={users} />
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
