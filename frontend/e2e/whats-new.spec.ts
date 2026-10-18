import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("novidades: ponto de não lida aparece e some depois de abrir a página", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/dashboard");
  await expect(page.getByTestId("whats-new-dot")).toBeVisible();

  await page.getByRole("link", { name: /Novidades/ }).first().click();
  await expect(page).toHaveURL(/\/novidades$/);
  await expect(page.getByTestId("whats-new-list").locator("li").first()).toBeVisible();
  await expect(page.getByTestId("whats-new-dot")).toHaveCount(0);

  // continua lido depois de recarregar (persistido no navegador)
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Novidades/ }).first()).toBeVisible();
  await expect(page.getByTestId("whats-new-dot")).toHaveCount(0);
});
