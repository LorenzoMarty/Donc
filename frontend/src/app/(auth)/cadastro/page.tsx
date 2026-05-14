"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";

import { MotionShell } from "@/components/shared/motion-shell";
import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(name, email, password);
      window.location.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-6 py-10">
      <MotionShell className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Donk ENEM</p>
            <h1 className="text-2xl font-black tracking-normal">Criar conta</h1>
          </div>
        </div>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input placeholder="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input placeholder="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Começar"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary">
              Entrar
            </Link>
          </p>
        </Card>
      </MotionShell>
    </main>
  );
}
