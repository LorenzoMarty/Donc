"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, History, Loader2 } from "lucide-react";

import { workflowLabel } from "@/app/(app)/admin/_tabs/ai-labels";
import { apiFetch } from "@/services/api";
import type { AdminUser, AIGenerationTrace, ContentVersion } from "@/types/api";

// Fraseado de evento (linha do tempo), diferente do rótulo de categoria de `ai-labels.ts` — cai
// pro rótulo genérico (REQ-7) quando o workflow não tem essa versão narrada especificamente.
const HISTORY_EVENT_LABELS: Record<string, string> = {
  admin_game_generation: "Jogo criado com assistência de IA",
  admin_game_question_regeneration: "Pergunta regenerada com assistência de IA",
  admin_game_question_addition: "Novas perguntas geradas com assistência de IA",
  admin_game_payload_generation: "Conteúdo gerado com assistência de IA",
  admin_activity_generation: "Exercício criado com assistência de IA",
  admin_theme_generation: "Tema criado com assistência de IA",
};

type HistoryEvent = {
  key: string;
  date: string;
  label: string;
};

/** REQ-8 (P3b): histórico inline — quem editou, quando, se veio de IA. Sempre linguagem de
 * produto (nunca workflow/model/JSON cru). */
export function HistoryPanel({
  contentType,
  contentId,
  users,
}: {
  contentType: string;
  contentId: number;
  users: AdminUser[];
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const loading = open && events === null;

  useEffect(() => {
    if (!open || events !== null) return;
    Promise.allSettled([
      apiFetch<ContentVersion[]>(`/admin/content-versions/${contentType}/${contentId}`),
      apiFetch<AIGenerationTrace[]>(`/admin/ai-generations/${contentType}/${contentId}`),
    ]).then(([versions, generations]) => {
      const versionEvents: HistoryEvent[] =
        versions.status === "fulfilled"
          ? versions.value.map((v) => ({
              key: `v-${v.id}`,
              date: v.created_at,
              label: `Editado por ${nameFor(users, v.edited_by)}`,
            }))
          : [];
      const generationEvents: HistoryEvent[] =
        generations.status === "fulfilled"
          ? generations.value.map((g) => ({
              key: `g-${g.id}`,
              date: g.created_at,
              label: HISTORY_EVENT_LABELS[g.workflow] ?? workflowLabel(g.workflow),
            }))
          : [];
      setEvents([...versionEvents, ...generationEvents].sort((a, b) => b.date.localeCompare(a.date)));
    });
  }, [open, events, contentType, contentId, users]);

  return (
    <div className="rounded-control bg-background/40 p-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <History className="h-3.5 w-3.5" />
        Histórico
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 pl-5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {!loading && events?.length === 0 && <p className="text-muted-foreground">Nenhuma alteração registrada ainda.</p>}
          {!loading &&
            events?.map((event) => (
              <p key={event.key} className="text-muted-foreground">
                <span className="font-medium text-foreground">{formatDate(event.date)}</span> — {event.label}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

function nameFor(users: AdminUser[], userId: number | null): string {
  if (userId === null) return "sistema";
  return users.find((u) => u.id === userId)?.name ?? "administrador";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
