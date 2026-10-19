"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { adminSupportApi } from "@/services/api";
import type { AdminSupportTicket } from "@/types/api";

export function TicketReplyButton({ ticket, onReplied }: { ticket: AdminSupportTicket; onReplied: (ticket: AdminSupportTicket) => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const updated = await adminSupportApi.reply(ticket.id, message.trim());
      toast.success("Resposta enviada ao aluno.");
      setMessage("");
      setOpen(false);
      onReplied(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a resposta.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Responder
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={ticket.subject} icon={MessageSquare} size="md">
        <div className="max-h-[40vh] space-y-2 overflow-y-auto text-sm">
          <p className="rounded-control bg-muted px-3 py-2 whitespace-pre-wrap break-words">{ticket.message}</p>
          {ticket.messages.map((item) => (
            <p
              key={item.id}
              className={
                item.author_role === "admin"
                  ? "rounded-control bg-primary/10 px-3 py-2 whitespace-pre-wrap break-words"
                  : "rounded-control bg-muted px-3 py-2 whitespace-pre-wrap break-words"
              }
            >
              <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.author_role === "admin" ? "Equipe" : ticket.user_name}
              </span>
              {item.body}
            </p>
          ))}
        </div>
        <Textarea
          className="mt-3"
          rows={4}
          maxLength={4000}
          value={message}
          aria-label="Resposta ao aluno"
          placeholder="Escreva a resposta. O aluno recebe um e-mail avisando."
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={sending || message.trim().length < 2} onClick={send}>
            {sending ? "Enviando..." : "Enviar resposta"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
