"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_TICKET_CATEGORIES } from "@/features/support/support-categories";
import { ApiClientError, supportApi } from "@/services/api";
import type { SupportTicketCategory } from "@/types/api";

const SUBJECT_MAX = 160;
const MESSAGE_MAX = 4000;
const SUBJECT_MIN = 4;
const MESSAGE_MIN = 10;

export function TicketForm() {
  const [category, setCategory] = useState<SupportTicketCategory>(SUPPORT_TICKET_CATEGORIES[0].value);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function clearFeedback() {
    setError(null);
    setSent(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (trimmedSubject.length < SUBJECT_MIN) {
      setError(`O assunto precisa ter pelo menos ${SUBJECT_MIN} caracteres.`);
      return;
    }
    if (trimmedMessage.length < MESSAGE_MIN) {
      setError(`A mensagem precisa ter pelo menos ${MESSAGE_MIN} caracteres.`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await supportApi.createTicket(category, trimmedSubject, trimmedMessage);
      toast.success("Chamado enviado.");
      setSent(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível enviar o chamado.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Categoria">
        <Select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as SupportTicketCategory);
            clearFeedback();
          }}
        >
          {SUPPORT_TICKET_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Assunto" counter={{ value: subject.length, max: SUBJECT_MAX }}>
        <Input
          value={subject}
          maxLength={SUBJECT_MAX}
          placeholder="Resuma o problema em poucas palavras"
          onChange={(event) => {
            setSubject(event.target.value);
            clearFeedback();
          }}
        />
      </Field>
      <Field label="Mensagem" counter={{ value: message.length, max: MESSAGE_MAX }}>
        <Textarea
          value={message}
          maxLength={MESSAGE_MAX}
          rows={5}
          placeholder="Descreva o que está acontecendo"
          onChange={(event) => {
            setMessage(event.target.value);
            clearFeedback();
          }}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {sent ? <p className="text-sm font-medium text-success">Chamado enviado. Nossa equipe vai responder em breve.</p> : null}
      <Button type="submit" disabled={sending} className="justify-self-start">
        {sending ? "Enviando..." : "Enviar chamado"}
      </Button>
    </form>
  );
}
