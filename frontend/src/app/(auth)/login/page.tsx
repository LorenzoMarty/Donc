"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { MotionShell } from "@/components/shared/motion-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/shared/google-signin-button";
import { TermsConsent } from "@/components/shared/terms-consent";
import { useAuth } from "@/providers/app-providers";
import { ApiClientError } from "@/services/api";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Conta nova via Google exige aceite dos termos: guarda o token e pede o aceite antes de repetir.
  const [pendingCredential, setPendingCredential] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function onGoogle(credential: string, accept = false) {
    setError("");
    try {
      await loginWithGoogle(credential, accept);
      window.location.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "terms_not_accepted") {
        setPendingCredential(credential);
        setError("Para criar a sua conta, aceite os termos abaixo e continue.");
        return;
      }
      setPendingCredential(null);
      setError(err instanceof Error ? err.message : "Falha ao entrar com o Google.");
    }
  }

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
      <section className="soft-grid flex items-center justify-center px-4 py-8 xs:px-6 xs:py-10">
        <MotionShell className="w-full max-w-md">
          <div className="mb-8 space-y-3">
            <BrandLink href="/" />
            <h1 className="text-3xl font-semibold tracking-tight">Entrar na plataforma</h1>
          </div>

          <Card className="p-4 xs:p-6">
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
            <div className="mt-5 space-y-3">
              <GoogleSignInButton onCredential={(credential) => void onGoogle(credential)} />
              {pendingCredential ? (
                <div className="space-y-3" data-testid="google-terms">
                  <TermsConsent checked={acceptedTerms} onChange={setAcceptedTerms} id="google-accept-terms" />
                  <Button type="button" className="w-full" disabled={!acceptedTerms} onClick={() => void onGoogle(pendingCredential, true)}>
                    Criar conta com Google
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex flex-col gap-3 text-sm xs:flex-row xs:items-center xs:justify-between">
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
      <section className="relative hidden bg-card lg:block">
        <Image src="/study-collaboration.jpg" alt="" fill sizes="45vw" className="object-cover" />
        <div className="relative z-10 flex h-full items-end p-10">
          <div className="game-surface max-w-lg bg-background/90 p-5">
            <p className="mb-3 text-sm font-semibold text-primary">Redação, dados e IA</p>
            <h2 className="text-4xl font-semibold tracking-normal">Estudo guiado para evoluir com clareza.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Nota por competência, sequência de dias e feedback da correção, tudo no mesmo painel.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
