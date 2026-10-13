import { describe, expect, it } from "vitest";

import { scrubEvent, sentryOptions } from "@/lib/sentry";

describe("sentry scrub", () => {
  it("remove corpo, cookies, querystring e headers de autenticação", () => {
    const event = scrubEvent({
      request: {
        data: { text: "minha redação" },
        cookies: { access_token: "x" },
        query_string: "token=abc",
        headers: { Authorization: "Bearer x", "User-Agent": "ua" },
      },
    });
    expect(event.request).toEqual({ headers: { "User-Agent": "ua" } });
  });

  it("remove usuário e breadcrumbs, e não coleta breadcrumbs novos", () => {
    const event = scrubEvent({ user: { email: "a@b.com" }, breadcrumbs: [{ message: "texto da redação" }] });
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(sentryOptions("https://k@example.invalid/1").beforeBreadcrumb()).toBeNull();
  });

  it("fica desligado sem DSN", () => {
    expect(sentryOptions(undefined).enabled).toBe(false);
    expect(sentryOptions("https://k@example.invalid/1").enabled).toBe(true);
  });
});
