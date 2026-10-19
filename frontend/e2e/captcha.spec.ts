import { test, expect } from "@playwright/test";

// Roda só com as chaves de TESTE da Cloudflare (sempre aprovam) e acesso à internet:
//   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
//     npx playwright test e2e/captcha.spec.ts
test.skip(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, "defina as chaves de teste do Turnstile para rodar");

const API = "http://localhost:8001/api/v1";

test("cadastro exige o captcha: sem token o backend recusa; pela tela o widget libera o cadastro", async ({ page, request }) => {
  const blocked = await request.post(`${API}/auth/register`, {
    data: { name: "Sem Captcha", email: `nocap-${Date.now()}@e2e-donc.com`, password: "senha12345", accept_terms: true },
  });
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error).toBe("captcha_failed");

  await page.goto("/cadastro");
  await expect(page.getByTestId("turnstile")).toBeAttached(); // widget só existe depois da hidratação
  await page.getByPlaceholder("Nome completo").fill("Aluno Captcha");
  await page.getByPlaceholder("E-mail").fill(`cap-${Date.now()}@e2e-donc.com`);
  await page.getByPlaceholder("Senha").fill("senha12345");
  await page.getByRole("checkbox").check();
  // dá tempo do widget invisível resolver o desafio de teste
  await expect.poll(() => page.locator('input[name="cf-turnstile-response"]').inputValue().catch(() => ""), { timeout: 20000 }).not.toBe("");
  await page.getByRole("button", { name: "Começar" }).click();
  await expect(page).toHaveURL(/\/assinatura$/);
});
