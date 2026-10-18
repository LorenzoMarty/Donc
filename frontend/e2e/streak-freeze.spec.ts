import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("dashboard mostra a sequência persistida no servidor com o congelamento semanal", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/dashboard");
  await expect(page.getByText("Sequência", { exact: true })).toBeVisible();
  await expect(page.getByText(/congelamento da semana (disponível|usado)/)).toBeVisible();
});
