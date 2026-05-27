"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/types/api";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h atrás`;
  return d.toLocaleDateString("pt-BR");
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function UsersTab({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
    : users;

  const online = users.filter((u) => {
    if (!u.last_seen_at) return false;
    return Date.now() - new Date(u.last_seen_at).getTime() < 300_000;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Badge variant="secondary">{online} online agora</Badge>
        <Badge variant="outline">{users.length} usuários</Badge>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium tabular-nums">XP</th>
                <th className="px-4 py-3 font-medium tabular-nums">Redações</th>
                <th className="px-4 py-3 font-medium tabular-nums">Eventos</th>
                <th className="px-4 py-3 font-medium tabular-nums">Tokens IA</th>
                <th className="px-4 py-3 font-medium">Visto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isOnline = user.last_seen_at && Date.now() - new Date(user.last_seen_at).getTime() < 300_000;
                return (
                  <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {isOnline && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Online" />}
                        {user.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "admin" ? "secondary" : "outline"} className="text-xs">{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{user.xp}</td>
                    <td className="px-4 py-3 tabular-nums">{user.essays}</td>
                    <td className="px-4 py-3 tabular-nums">{user.event_count}</td>
                    <td className="px-4 py-3 tabular-nums">{user.total_tokens > 0 ? formatTokens(user.total_tokens) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(user.last_seen_at)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
