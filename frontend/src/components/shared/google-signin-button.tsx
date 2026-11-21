"use client";

import { useEffect, useRef } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: string }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("google_script_failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const googleLoginEnabled = Boolean(CLIENT_ID);

/** Botão oficial "Continuar com Google" (Google Identity Services, fluxo de ID token: sem redirect nem
 * callback no proxy `/api/backend`). Sem `NEXT_PUBLIC_GOOGLE_CLIENT_ID` não renderiza nada. */
export function GoogleSignInButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (credential: string) => void;
  text?: "continue_with" | "signin_with" | "signup_with";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          locale: "pt-BR",
          width: Math.min(400, containerRef.current.clientWidth || 320),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  return <div ref={containerRef} className="flex min-h-[44px] w-full justify-center" data-testid="google-signin" />;
}
