"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supportCategoryLabel } from "@/features/support/support-categories";
import { ApiClientError, supportApi, type SupportTicket } from "@/services/api";
import { cn } from "@/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** "Meus chamados": o aluno acompanha as respostas da equipe e pode responder na própria thread. */
export function MyTickets({ refreshKey = 0 }: { refreshKey?: number }) {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);

  useEffect(() => {
    let active = true;
    supportApi
      .myTickets()
      .then((items) => active && setTickets(items))
      .catch(() => active && setTickets([]));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (tickets === null) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (tickets.length === 0) return <p className="text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>;

  return (
    <ul className="grid gap-3" data-testid="my-tickets">
      {tickets.map((ticket) => (
        <TicketThread
          key={ticket.id}
          ticket={ticket}
          onUpdated={(updated) => setTickets((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? current)}
        />
      ))}
    </ul>
  );
}

function TicketThread({ ticket, onUpdated }: { ticket: SupportTicket; onUpdated: (ticket: SupportTicket) => void }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const answered = ticket.messages.some((message) => message.author_role === "admin");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reply.trim().length < 2) return;
    setSending(true);
    try {
      onUpdated(await supportApi.reply(ticket.id, reply.trim()));
      setReply("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <li className="rounded-control border border-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{ticket.subject}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{supportCategoryLabel(ticket.category)}</Badge>
          <Badge variant={ticket.status === "resolved" ? "secondary" : "outline"}>
            {ticket.status === "resolved" ? "Resolvido" : answered ? "Respondido" : "Aguardando resposta"}
          </Badge>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Aberto em {formatDate(ticket.created_at)}</p>

      <div className="mt-3 grid gap-2">
        <Bubble role="student" body={ticket.message} />
        {ticket.messages.map((message) => (
          <Bubble key={message.id} role={message.author_role} body={message.body} />
        ))}
      </div>

      <form onSubmit={submit} className="mt-3 grid gap-2">
        <Textarea
          value={reply}
          rows={2}
          maxLength={4000}
          aria-label={`Responder ao chamado ${ticket.subject}`}
          placeholder="Escreva uma resposta"
          onChange={(event) => setReply(event.target.value)}
        />
        <Button type="submit" size="sm" className="min-h-11 justify-self-start" disabled={sending || reply.trim().length < 2}>
          {sending ? "Enviando..." : "Responder"}
        </Button>
      </form>
    </li>
  );
}

function Bubble({ role, body }: { role: "student" | "admin"; body: string }) {
  return (
    <div className={cn("max-w-[90%] rounded-control px-3 py-2 text-sm", role === "admin" ? "bg-primary/10" : "justify-self-end bg-muted")}>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{role === "admin" ? "Equipe Donc" : "Você"}</p>
      <p className="whitespace-pre-wrap break-words">{body}</p>
    </div>
  );
}
