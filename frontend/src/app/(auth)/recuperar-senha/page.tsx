"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";

import { MotionShell } from "@/components/shared/motion-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi } from "@/services/api";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await authApi.recover(email).catch((error) => ({ message: error.message }));
    setMessage(response.message);
    setLoading(false);
  }

  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-6 py-10">
      <MotionShell className="w-full max-w-md">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-secondary/18 p-3 text-secondary">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-normal">Recuperar senha</h1>
              <p className="text-sm text-muted-foreground">Receba instruções no seu e-mail.</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            {message && <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">{message}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar instruções"}
            </Button>
          </form>
          <Link href="/login" className="mt-5 block text-center text-sm font-medium text-primary">
            Voltar para login
          </Link>
        </Card>
      </MotionShell>
    </main>
  );
}
