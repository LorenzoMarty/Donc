"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { KeyRound } from "lucide-react";

import { MotionShell } from "@/components/shared/motion-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi } from "@/services/api";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Link inválido. <Link href="/recuperar-senha" className="font-medium underline">Peça uma nova recuperação</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">Senha redefinida. Já pode entrar com a nova senha.</p>
        <Button asChild className="w-full">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="new-password">
          Nova senha
        </label>
        <Input id="new-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirm-password">
          Confirmar nova senha
        </label>
        <Input id="confirm-password" type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={loading}>
        {loading ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-6 py-10">
      <MotionShell className="w-full max-w-md">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Nova senha</h1>
          </div>
          <Suspense>
            <ResetForm />
          </Suspense>
        </Card>
      </MotionShell>
    </main>
  );
}
