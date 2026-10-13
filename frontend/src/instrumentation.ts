import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry";

// Servidor (Node e edge/proxy). Sem DSN vira no-op. Source maps não são enviados de propósito:
// sem o wrapper `withSentryConfig`, o build do Docker segue idêntico ao de antes.
export function register() {
  Sentry.init(sentryOptions(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN));
}

export const onRequestError = Sentry.captureRequestError;
