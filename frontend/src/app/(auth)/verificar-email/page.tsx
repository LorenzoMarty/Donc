"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MailCheck } from "lucide-react";

import { MotionShell } from "@/components/shared/motion-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authApi } from "@/services/api";

type Status = "loading" | "done" | "error" | "missing";

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "missing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .verifyEmail(token)
      .then(() => active && setStatus("done"))
      .catch((err) => {
        if (!active) return;
        setMessage(err instanceof Error ? err.message : "Não foi possível confirmar o e-mail.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (status === "loading") return <p className="text-sm text-muted-foreground">Confirmando seu e-mail...</p>;

  if (status === "done") {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent" data-testid="email-verified">
          E-mail confirmado. Agora você já pode assinar.
        </p>
        <Button asChild className="w-full">
          <Link href="/assinatura">Continuar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {status === "missing" ? "Link inválido." : message}
      </p>
      <Button asChild variant="secondary" className="w-full">
        <Link href="/assinatura">Pedir novo e-mail de confirmação</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-6 py-10">
      <MotionShell className="w-full max-w-md">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Confirmar e-mail</h1>
          </div>
          <Suspense>
            <VerifyEmail />
          </Suspense>
        </Card>
      </MotionShell>
    </main>
  );
}
