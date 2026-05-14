"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Envie uma dúvida de Português, interpretação ou redação ENEM.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setLoading(true);
    const response = await apiFetch<{ answer: string; suggestions: string[] }>("/tutor/chat", {
      method: "POST",
      body: JSON.stringify({ message: text }),
    });
    setMessages((current) => [...current, { role: "assistant", content: response.answer }]);
    setLoading(false);
  }

  return (
    <div className="game-surface flex h-[680px] flex-col overflow-hidden bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
            {message.role === "assistant" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
            <div className={`max-w-[78%] rounded-2xl border-2 border-foreground px-4 py-3 text-sm font-semibold leading-6 shadow-[0_3px_0_hsl(var(--foreground))] ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-background/72"}`}>{message.content}</div>
            {message.role === "user" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-secondary text-secondary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
          </div>
        ))}
        {loading && <div className="game-tile inline-flex bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">Pensando...</div>}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t-2 border-foreground p-4">
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Digite sua dúvida..." />
        <Button>
          <Send className="h-4 w-4" aria-hidden="true" />
          Enviar
        </Button>
      </form>
    </div>
  );
}
