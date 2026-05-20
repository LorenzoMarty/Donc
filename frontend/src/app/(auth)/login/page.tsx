"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";

import { MotionShell } from "@/components/shared/motion-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/app-providers";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("aluno@demo.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.9fr]">
      <section className="soft-grid flex items-center justify-center px-6 py-10">
        <MotionShell className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Donk ENEM</p>
              <h1 className="text-2xl font-semibold tracking-normal">Entrar na plataforma</h1>
            </div>
          </div>

          <Card className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  E-mail
                </label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Senha
                </label>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
            <div className="mt-5 flex items-center justify-between text-sm">
              <Link href="/recuperar-senha" className="font-medium text-primary">
                Recuperar senha
              </Link>
              <Link href="/cadastro" className="font-medium text-primary">
                Criar conta
              </Link>
            </div>
          </Card>
        </MotionShell>
      </section>
      <section className="hidden border-l border-border bg-card lg:block">
        <div
          className="flex h-full items-end bg-cover bg-center p-10"
          style={{ backgroundImage: "url('/study-collaboration.jpg')" }}
        >
          <div className="game-surface max-w-lg bg-background/90 p-5">
            <p className="mb-3 text-sm font-semibold text-primary">Redação, dados e IA</p>
            <h2 className="text-4xl font-semibold tracking-normal">Estudo guiado para evoluir com clareza.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Acompanhe competências, rotina, simulados e feedbacks em uma experiência única.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
