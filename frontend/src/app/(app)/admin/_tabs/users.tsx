"use client";

import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Edit2, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api";
import type { AdminUser } from "@/types/api";

const ONLINE_WINDOW_MS = 300_000;

function formatDate(iso: string | null, now: number | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (now === null) return d.toLocaleDateString("pt-BR");
  const diff = now - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min atras`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h atras`;
  return d.toLocaleDateString("pt-BR");
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type UserDraft = {
  name: string;
  xp: string;
  level: string;
  streak_days: string;
  daily_goal_minutes: string;
};

function draftFromUser(user: AdminUser): UserDraft {
  return {
    name: user.name,
    xp: String(user.xp),
    level: String(user.level),
    streak_days: String(user.streak_days),
    daily_goal_minutes: String(user.daily_goal_minutes),
  };
}

export function UsersTab({
  users,
  onUserUpdated,
  onUserDeleted,
}: {
  users: AdminUser[];
  onUserUpdated: (user: AdminUser) => void;
  onUserDeleted: (userId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
    : users;

  const online = users.filter((u) => {
    if (!u.last_seen_at) return false;
    return now !== null && now - new Date(u.last_seen_at).getTime() < ONLINE_WINDOW_MS;
  }).length;

  function startEditing(user: AdminUser) {
    setEditingId(user.id);
    setDraft(draftFromUser(user));
  }

  async function saveUser(user: AdminUser) {
    if (!draft || busyId) return;
    setBusyId(user.id);
    try {
      const updated = await apiFetch<AdminUser>(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          xp: Number(draft.xp),
          level: Number(draft.level),
          streak_days: Number(draft.streak_days),
          daily_goal_minutes: Number(draft.daily_goal_minutes),
        }),
      });
      onUserUpdated(updated);
      setEditingId(null);
      setDraft(null);
      toast.success("Aluno atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel atualizar o aluno.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (busyId) return;
    if (!window.confirm(`Excluir o aluno ${user.name}? Esta acao remove a conta e seus dados vinculados.`)) return;
    setBusyId(user.id);
    try {
      await apiFetch<{ action: "deleted"; user_id: number }>(`/admin/users/${user.id}`, { method: "DELETE" });
      onUserDeleted(user.id);
      if (editingId === user.id) {
        setEditingId(null);
        setDraft(null);
      }
      toast.success("Aluno excluido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel excluir o aluno.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Badge variant="secondary">{online} online agora</Badge>
        <Badge variant="outline">{users.length} usuarios</Badge>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium tabular-nums">XP</th>
                <th className="px-4 py-3 font-medium tabular-nums">Nivel</th>
                <th className="px-4 py-3 font-medium tabular-nums">Sequencia</th>
                <th className="px-4 py-3 font-medium tabular-nums">Meta</th>
                <th className="px-4 py-3 font-medium tabular-nums">Redacoes</th>
                <th className="px-4 py-3 font-medium tabular-nums">Tokens IA</th>
                <th className="px-4 py-3 font-medium">Visto</th>
                <th className="px-4 py-3 font-medium text-right">Controle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isOnline = user.last_seen_at && now !== null && now - new Date(user.last_seen_at).getTime() < ONLINE_WINDOW_MS;
                const isEditing = editingId === user.id;
                const isStudent = user.role === "student";
                return (
                  <Fragment key={user.id}>
                    <tr className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {isOnline && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Online" />}
                          {user.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === "admin" ? "secondary" : "outline"} className="text-xs">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{user.xp}</td>
                      <td className="px-4 py-3 tabular-nums">{user.level}</td>
                      <td className="px-4 py-3 tabular-nums">{user.streak_days}d</td>
                      <td className="px-4 py-3 tabular-nums">{user.daily_goal_minutes}min</td>
                      <td className="px-4 py-3 tabular-nums">{user.essays}</td>
                      <td className="px-4 py-3 tabular-nums">{user.total_tokens > 0 ? formatTokens(user.total_tokens) : "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(user.last_seen_at, now)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            disabled={!isStudent || busyId === user.id}
                            onClick={() => (isEditing ? (setEditingId(null), setDraft(null)) : startEditing(user))}
                            aria-label={isEditing ? "Fechar controle do aluno" : "Controlar aluno"}
                          >
                            {isEditing ? <X className="h-4 w-4" aria-hidden="true" /> : <Edit2 className="h-4 w-4" aria-hidden="true" />}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            disabled={!isStudent || busyId === user.id}
                            onClick={() => deleteUser(user)}
                            aria-label="Excluir aluno"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && draft ? (
                      <tr key={`${user.id}-editor`} className="border-b bg-muted/25">
                        <td colSpan={11} className="px-4 py-4">
                          <StudentEditor
                            draft={draft}
                            busy={busyId === user.id}
                            onChange={setDraft}
                            onCancel={() => {
                              setEditingId(null);
                              setDraft(null);
                            }}
                            onSave={() => saveUser(user)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentEditor({
  draft,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  draft: UserDraft;
  busy: boolean;
  onChange: (draft: UserDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1.4fr)_repeat(4,minmax(6rem,0.8fr))_auto] lg:items-end">
      <Field label="Nome">
        <Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} disabled={busy} />
      </Field>
      <Field label="XP">
        <Input type="number" min={0} value={draft.xp} onChange={(event) => onChange({ ...draft, xp: event.target.value })} disabled={busy} />
      </Field>
      <Field label="Nivel">
        <Input type="number" min={1} value={draft.level} onChange={(event) => onChange({ ...draft, level: event.target.value })} disabled={busy} />
      </Field>
      <Field label="Sequencia">
        <Input
          type="number"
          min={0}
          value={draft.streak_days}
          onChange={(event) => onChange({ ...draft, streak_days: event.target.value })}
          disabled={busy}
        />
      </Field>
      <Field label="Meta diaria">
        <Input
          type="number"
          min={10}
          value={draft.daily_goal_minutes}
          onChange={(event) => onChange({ ...draft, daily_goal_minutes: event.target.value })}
          disabled={busy}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={busy}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Salvar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
