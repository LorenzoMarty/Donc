"use client";

import { useEffect, useState } from "react";
import { BarChart3, BookOpen, FileText, Users } from "lucide-react";

import { LoadingCard } from "@/components/shared/loading-card";
import { MetricCard } from "@/components/shared/metric-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, type AdminMetrics } from "@/services/api";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  essays: number;
};

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<AdminMetrics>("/admin/metrics"), apiFetch<AdminUser[]>("/admin/users")])
      .then(([metricsPayload, usersPayload]) => {
        setMetrics(metricsPayload);
        setUsers(usersPayload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Acesso indisponível."));
  }, []);

  if (error) {
    return (
      <MotionShell>
        <Card className="p-8">
          <Badge variant="outline">Admin</Badge>
          <h1 className="mt-3 text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </Card>
      </MotionShell>
    );
  }

  if (!metrics) return <LoadingCard />;

  return (
    <MotionShell className="space-y-6">
      <div>
        <Badge variant="secondary">Painel administrativo</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal md:text-4xl">Operação e dados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Gerencie usuários, acompanhe métricas e monitore a produção pedagógica.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Usuários" value={`${metrics.users}`} detail="Contas cadastradas" icon={Users} />
        <MetricCard title="Redações" value={`${metrics.essays}`} detail={`${metrics.corrected_essays} corrigidas`} icon={FileText} />
        <MetricCard title="Aulas" value={`${metrics.lessons}`} detail={`${metrics.exercises} exercícios`} icon={BookOpen} />
        <MetricCard title="Média geral" value={`${metrics.average_score}`} detail={`${metrics.active_themes} temas ativos`} icon={BarChart3} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Nome</th>
                <th className="py-3 font-medium">E-mail</th>
                <th className="py-3 font-medium">Papel</th>
                <th className="py-3 font-medium">Nível</th>
                <th className="py-3 font-medium">XP</th>
                <th className="py-3 font-medium">Redações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="py-3 font-medium">{user.name}</td>
                  <td className="py-3 text-muted-foreground">{user.email}</td>
                  <td className="py-3">{user.role}</td>
                  <td className="py-3">{user.level}</td>
                  <td className="py-3">{user.xp}</td>
                  <td className="py-3">{user.essays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </MotionShell>
  );
}
