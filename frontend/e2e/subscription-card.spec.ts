import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("perfil mostra próxima cobrança e o histórico de cobranças", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/perfil");
  await expect(page.getByTestId("next-charge")).toContainText("Próxima cobrança em");
  const history = page.getByTestId("payment-history");
  await expect(history).toBeVisible();
  await expect(history).not.toContainText("Carregando...");
});
