import { test, expect } from "@playwright/test";

const API = "http://localhost:8001/api/v1";

test("conta nova não verificada vê o aviso e não consegue ir para o pagamento", async ({ page }) => {
  const email = `verify-${Date.now()}@e2e-donc.com`;
  const res = await page.request.post(`${API}/auth/register`, {
    data: { name: "Aluno Novo", email, password: "senha12345", accept_terms: true },
  });
  expect(res.ok(), "cadastro deve responder 201").toBeTruthy();

  await page.goto("/assinatura");
  await expect(page.getByTestId("verify-email-notice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reenviar e-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ir para pagamento" })).toBeDisabled();
});

test("link de confirmação inválido mostra erro", async ({ page }) => {
  await page.goto("/verificar-email?token=token-invalido-123456");
  await expect(page.getByText(/inválido ou expirado/i)).toBeVisible();
  await expect(page.getByTestId("email-verified")).toHaveCount(0);
});
