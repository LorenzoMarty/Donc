"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Envie uma duvida de Portugues, interpretacao ou redacao ENEM.",
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
    <div className="glass-surface flex h-[680px] flex-col overflow-hidden rounded-lg">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
            {message.role === "assistant" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
            <div className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-background/72"}`}>{message.content}</div>
            {message.role === "user" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
          </div>
        ))}
        {loading && <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">Pensando...</div>}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-4">
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Digite sua duvida..." />
        <Button>
          <Send className="h-4 w-4" aria-hidden="true" />
          Enviar
        </Button>
      </form>
    </div>
  );
}
