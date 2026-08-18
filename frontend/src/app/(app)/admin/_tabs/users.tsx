"use client";

import { Fragment, useEffect, useState } from "react";
import { BarChart3, Edit2, Eye, Loader2, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CompetencyBarChart } from "@/components/shared/charts";
import { apiFetch } from "@/services/api";
import { formatBRLCents, formatTokens } from "@/lib/format";
import type { AdminUser, AdminUserDetail } from "@/types/api";

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

type UserDraft = {
  name: string;
  streak_days: string;
  daily_goal_minutes: string;
};

function draftFromUser(user: AdminUser): UserDraft {
  return {
    name: user.name,
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
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  async function openDetail(user: AdminUser) {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await apiFetch<AdminUserDetail>(`/admin/users/${user.id}/detail`);
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar os detalhes do aluno.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

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
          streak_days: Number(draft.streak_days),
          daily_goal_minutes: Number(draft.daily_goal_minutes),
        }),
      });
      onUserUpdated(updated);
      setEditingId(null);
      setDraft(null);
      toast.success("Aluno atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o aluno.");
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
      toast.success("Aluno excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o aluno.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{online} ativo{online === 1 ? "" : "s"} agora</Badge>
        <Badge variant="outline">{users.length} usuários</Badge>
      </div>

      <div className="rounded-card bg-card shadow-soft">
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
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
                          {isOnline && <span className="h-2 w-2 rounded-full bg-success" title="Ativo agora" />}
                          {user.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === "admin" ? "secondary" : "outline"} className="text-xs">
                          {user.role === "admin" ? "Administrador" : "Aluno"}
                        </Badge>
                      </td>
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
                            onClick={() => openDetail(user)}
                            aria-label="Ver progresso e consumo de IA"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
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
                        <td colSpan={9} className="px-4 py-4">
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
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado com esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail ? detail.user.name : "Detalhe do aluno"}
        description={detail ? detail.user.email : undefined}
        icon={BarChart3}
        size="lg"
      >
        {detailLoading || !detail ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : (
          <UserDetailView detail={detail} />
        )}
      </Modal>
    </div>
  );
}

function UserDetailView({ detail }: { detail: AdminUserDetail }) {
  const { progress, learning_profile: profile, ai_usage: ai } = detail;
  const masteryData = progress.mastery_map.map((point) => ({ competency: point.competency, value: point.value }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Progresso" value={`${progress.progress_general}%`} />
        <Stat label="Média redação" value={String(progress.essay_average)} />
        <Stat label="Aulas concluídas" value={String(progress.completed_lessons)} />
        <Stat label="Acerto em exercícios" value={`${progress.correct_exercises_rate}%`} />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Domínio por competência</h3>
        <CompetencyBarChart data={masteryData} />
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          Consumo de IA
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tokens" value={formatTokens(ai.total_tokens)} />
          <Stat label="Chamadas" value={String(ai.total_calls)} />
          <Stat label="Erros" value={String(ai.error_calls)} />
          <Stat label="Custo" value={formatBRLCents(ai.cost_brl_cents)} />
        </div>
        {ai.agents.length ? (
          <div className="mt-3 space-y-1">
            {ai.agents.slice(0, 6).map((agent) => (
              <div key={`${agent.workflow}-${agent.agent}`} className="flex items-center justify-between gap-2 rounded-control bg-background/40 px-3 py-1.5 text-xs shadow-soft">
                <span className="min-w-0 truncate font-medium">{agent.agent}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatTokens(agent.total_tokens)} tok · {formatBRLCents(agent.cost_brl_cents)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Sem consumo de IA registrado.</p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <DetailList title="Competências fracas" items={Object.entries(profile.weak_competencies).map(([k, v]) => `${k.toUpperCase()}: ${v}x`)} />
        <DetailList title="Erros recorrentes" items={profile.recurring_errors.length ? profile.recurring_errors : progress.recurrent_errors} />
        <DetailList title="Recomendacoes" items={profile.recommendations} />
        <DetailList title="Repertórios usados" items={profile.repertories_used} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-background/40 px-3 py-2 shadow-soft">
      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">{title}</h4>
      {items.length ? (
        <ul className="space-y-1 text-xs">
          {items.map((item, index) => (
            <li key={index} className="rounded-control bg-background/40 px-2.5 py-1.5 shadow-soft">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">—</p>
      )}
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
    <div className="collapse-in grid gap-3 lg:grid-cols-[minmax(12rem,1.4fr)_repeat(2,minmax(6rem,0.8fr))_auto] lg:items-end">
      <Field label="Nome">
        <Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} disabled={busy} />
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
      <Field label="Meta diária">
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
