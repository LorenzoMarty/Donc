import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("admin vê assinantes ativos, MRR, churn e o checklist de lançamento (persistido ao recarregar)", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: ADMIN });
  expect(res.ok(), "login admin deve responder 200").toBeTruthy();

  await page.goto("/admin?tab=subscriptions");
  const metrics = page.getByTestId("subscription-metrics");
  await expect(metrics).toContainText("Receita recorrente (MRR)");
  await expect(metrics).toContainText("Assinantes ativos");
  await expect(metrics).toContainText("Churn (30 dias)");

  await page.goto("/admin");
  const checklist = page.getByTestId("launch-checklist");
  await expect(checklist).toBeVisible();
  await expect(checklist).toContainText("0 de 12 itens");
  await checklist.getByLabel(/Domínio com HTTPS no ar/).check();
  await expect(checklist).toContainText("1 de 12 itens");

  await page.reload();
  await expect(page.getByTestId("launch-checklist")).toContainText("1 de 12 itens");
});
