import type { ErrorEvent, Event } from "@sentry/nextjs";

// PII: redação é dado de aluno. Nada de corpo de request, cookies, querystring nem headers de
// autenticação vai pro Sentry — mesma regra do backend (src/telemetry/sentry.py).
const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "x-csrf-token", "x-signature"]);

export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([key]) => !SENSITIVE_HEADERS.has(key.toLowerCase())),
      );
    }
  }
  return event;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
  };
}
