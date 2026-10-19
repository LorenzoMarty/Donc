"use client";

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const turnstileEnabled = Boolean(SITE_KEY);

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_script_failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Captcha invisível (Cloudflare Turnstile). Sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY` não renderiza nada
 * e o formulário segue sem token (o backend só exige quando tem a chave secreta). `resetKey`
 * renova o desafio — o token vale uma única verificação. */
export function TurnstileWidget({ onToken, resetKey = 0 }: { onToken: (token: string | null) => void; resetKey?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current) {
      onTokenRef.current(null);
      window.turnstile?.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} data-testid="turnstile" />;
}
