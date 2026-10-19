"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { MotionShell } from "@/components/shared/motion-shell";
import { GoogleSignInButton } from "@/components/shared/google-signin-button";
import { TermsConsent } from "@/components/shared/terms-consent";
import { TurnstileWidget, turnstileEnabled } from "@/components/shared/turnstile-widget";
import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function onGoogle(credential: string) {
    if (!accepted) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para continuar com o Google.");
      return;
    }
    setError("");
    try {
      await loginWithGoogle(credential, true);
      window.location.replace("/assinatura");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar com o Google.");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(name, email, password, captchaToken);
      window.location.replace("/assinatura");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
      setCaptchaReset((value) => value + 1); // o token do captcha vale uma única verificação
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-4 py-8 xs:px-6 xs:py-10">
      <MotionShell className="w-full max-w-md">
        <div className="mb-8 space-y-3">
          <BrandLink href="/" />
          <h1 className="text-3xl font-semibold tracking-tight">Criar conta</h1>
        </div>
        <Card className="p-4 xs:p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input placeholder="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            <TermsConsent checked={accepted} onChange={setAccepted} />
            <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} />
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading || (turnstileEnabled && !captchaToken)}>
              {loading ? "Criando..." : "Começar"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
          <div className="mt-4">
            <GoogleSignInButton text="signup_with" onCredential={(credential) => void onGoogle(credential)} />
          </div>
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
