"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { supportCategoryLabel } from "@/features/support/support-categories";
import { adminSupportApi } from "@/services/api";
import type { AdminSupportTicket, AdminSupportTicketListResponse } from "@/types/api";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "open", label: "Aberto" },
  { value: "resolved", label: "Resolvido" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SupportTicketsTab() {
  const [items, setItems] = useState<AdminSupportTicket[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminSupportApi
      .listTickets({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status: status || undefined })
      .then((data: AdminSupportTicketListResponse) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Não foi possível carregar os chamados.");
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  async function resolveTicket(ticket: AdminSupportTicket) {
    if (busyId) return;
    setBusyId(ticket.id);
    try {
      const updated = await adminSupportApi.updateStatus(ticket.id, "resolved");
      setItems((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? prev);
      toast.success("Chamado marcado como resolvido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o chamado.");
    } finally {
      setBusyId(null);
    }
  }

  const rows = items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
          className="w-auto min-w-[10rem]"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Badge variant="outline">{total.toLocaleString("pt-BR")} chamado{total === 1 ? "" : "s"}</Badge>
      </div>

      <div className="rounded-card bg-card shadow-soft">
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-4 py-3 font-medium">Aberto em</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ticket) => (
                <tr key={ticket.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ticket.user_name}</div>
                    <div className="text-xs text-muted-foreground">{ticket.user_email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{supportCategoryLabel(ticket.category)}</td>
                  <td className="px-4 py-3">{ticket.subject}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(ticket.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ticket.status === "resolved" ? "secondary" : "outline"} className="text-xs">
                      {ticket.status === "resolved" ? "Resolvido" : "Aberto"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={ticket.status === "resolved" || busyId === ticket.id}
                      onClick={() => resolveTicket(ticket)}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Marcar como resolvido
                    </Button>
                  </td>
                </tr>
              ))}
              {items === null && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {items !== null && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum chamado encontrado com esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
