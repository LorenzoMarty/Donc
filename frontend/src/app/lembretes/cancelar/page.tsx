"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BellOff } from "lucide-react";

import { MotionShell } from "@/components/shared/motion-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authApi } from "@/services/api";

type Status = "loading" | "done" | "error";

function Unsubscribe() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .unsubscribeReminders(token)
      .then(() => active && setStatus("done"))
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [token]);

  if (status === "loading") return <p className="text-sm text-muted-foreground">Desativando os lembretes...</p>;

  if (status === "done") {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent" data-testid="unsubscribed">
          Pronto: você não recebe mais lembretes por e-mail. Para voltar a receber, ative em Perfil.
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard">Voltar ao painel</Link>
        </Button>
      </div>
    );
  }

  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      Link inválido ou expirado. Você pode desativar os lembretes em Perfil, na sua conta.
    </p>
  );
}

export default function UnsubscribeRemindersPage() {
  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-6 py-10">
      <MotionShell className="w-full max-w-md">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <BellOff className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Lembretes por e-mail</h1>
          </div>
          <Suspense>
            <Unsubscribe />
          </Suspense>
        </Card>
      </MotionShell>
    </main>
  );
}
