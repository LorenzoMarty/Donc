import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry";

// Navegador. NEXT_PUBLIC_SENTRY_DSN é injetado em build time (ver ARG no Dockerfile).
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
