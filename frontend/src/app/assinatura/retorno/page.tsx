"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { MotionShell } from "@/components/shared/motion-shell";
import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authApi, subscriptionApi } from "@/services/api";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10; // ~20s — tempo tipico do webhook do Mercado Pago confirmar o pagamento

type Phase = "confirming" | "confirmed" | "timeout" | "session-sync-failed";

export default function AssinaturaRetornoPage() {
  const { logout } = useAuth();
  const [phase, setPhase] = useState<Phase>("confirming");
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled && attemptsRef.current < MAX_ATTEMPTS) {
        attemptsRef.current += 1;
        try {
          const subscription = await subscriptionApi.me();
          if (subscription && (subscription.status === "active" || subscription.status === "grace")) {
            if (cancelled) return;
            setPhase("confirmed");
            try {
              // Reemite o token com a claim `sa` atualizada antes de seguir pro dashboard —
              // senão o proxy.ts (que só lê o token antigo) manda de volta pro paywall. Se
              // falhar, NÃO navega — navegar mesmo assim gera loop de reload infinito.
              await authApi.refreshSession();
              window.location.replace("/dashboard");
            } catch {
              if (!cancelled) setPhase("session-sync-failed");
            }
            return;
          }
        } catch {
          // rede instável durante o polling não é motivo pra desistir antes do prazo
        }
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (!cancelled) setPhase("timeout");
    }

    const id = window.setTimeout(poll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  function retry() {
    attemptsRef.current = 0;
    setPhase("confirming");
  }

  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-4 py-8 xs:px-6 xs:py-10">
      <MotionShell className="w-full max-w-md">
        <div className="mb-8 space-y-3">
          <BrandLink href="/" />
        </div>
        <Card className="p-6 text-center">
          {phase === "session-sync-failed" ? (
            <>
              <h1 className="text-xl font-semibold">Pagamento confirmado</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Não conseguimos atualizar sua sessão automaticamente. Saia e entre novamente para acessar a plataforma.
              </p>
              <Button className="mt-5 w-full" onClick={logout}>
                Sair e entrar novamente
              </Button>
            </>
          ) : phase === "timeout" ? (
            <>
              <h1 className="text-xl font-semibold">Ainda confirmando o pagamento</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                O Mercado Pago pode levar mais alguns instantes pra confirmar. Tente de novo em breve.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={retry}>Verificar novamente</Button>
                <Link href="/perfil" className="text-sm font-medium text-primary">
                  Ir para o perfil
                </Link>
              </div>
            </>
          ) : phase === "confirmed" ? (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="mt-3 text-xl font-semibold">Pagamento confirmado</h1>
              <p className="mt-2 text-sm text-muted-foreground">Redirecionando para o painel...</p>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
              <h1 className="mt-3 text-xl font-semibold">Confirmando seu pagamento</h1>
              <p className="mt-2 text-sm text-muted-foreground">Isso leva só alguns segundos.</p>
            </>
          )}
        </Card>
      </MotionShell>
    </main>
  );
}
