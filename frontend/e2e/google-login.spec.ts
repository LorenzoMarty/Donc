import http from "node:http";

import { test, expect, type Page } from "@playwright/test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

// Roda só com um Client ID fictício e as chaves públicas servidas por este teste (sem falar com o Google):
//   GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com NEXT_PUBLIC_GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com \
//   GOOGLE_JWKS_URL=http://localhost:8765/jwks.json npx playwright test e2e/google-login.spec.ts
// O botão do Google é trocado por um stub no navegador; token, JWKS, backend e sessão são os reais.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
test.skip(!CLIENT_ID || !process.env.GOOGLE_JWKS_URL, "defina as variáveis do login com Google para rodar");

let server: http.Server;
let privateKey: CryptoKey;

test.beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "e2e-key", alg: "RS256", use: "sig" };
  server = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(8765, resolve));
});

test.afterAll(() => {
  server?.close();
});

async function googleToken(email: string, sub: string) {
  return new SignJWT({ email, email_verified: true, name: "Pessoa Google", sub })
    .setProtectedHeader({ alg: "RS256", kid: "e2e-key" })
    .setIssuer("https://accounts.google.com")
    .setAudience(CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

async function installGoogleStub(page: Page, credential: string) {
  await page.addInitScript((cred) => {
    let callback: (response: { credential: string }) => void = () => undefined;
    (window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: (config: { callback: typeof callback }) => {
            callback = config.callback;
          },
          renderButton: (element: HTMLElement) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Continuar com Google";
            button.onclick = () => callback({ credential: cred });
            element.appendChild(button);
          },
        },
      },
    };
  }, credential);
}

test("conta existente (e-mail verificado pelo Google) é vinculada e cai no dashboard", async ({ page }) => {
  await installGoogleStub(page, await googleToken("aluno@demo.com", "sub-demo"));
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Olá|Boas-vindas/ }).first()).toBeVisible();
});

test("e-mail novo exige aceitar os termos e cria a conta (cai no paywall)", async ({ page }) => {
  await installGoogleStub(page, await googleToken(`novo-${Date.now()}@e2e-donc.com`, `sub-${Date.now()}`));
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar com Google" }).click();

  const terms = page.getByTestId("google-terms");
  await expect(terms).toBeVisible();
  const submit = terms.getByRole("button", { name: "Criar conta com Google" });
  await expect(submit).toBeDisabled();
  await terms.getByRole("checkbox").check();
  await submit.click();
  await expect(page).toHaveURL(/\/assinatura$/);
});
