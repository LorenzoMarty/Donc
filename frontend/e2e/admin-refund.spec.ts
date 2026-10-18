import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("admin vê o painel de conciliação e o modal de reembolso", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: ADMIN });
  expect(res.ok(), "login admin deve responder 200").toBeTruthy();

  await page.goto("/admin?tab=subscriptions");
  await expect(page.getByTestId("reconciliation")).toBeVisible();

  const refund = page.getByRole("button", { name: "Reembolsar" }).first();
  await expect(refund).toBeVisible();
  await refund.click();
  await expect(page.getByRole("button", { name: "Confirmar reembolso" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar reembolso" })).toHaveCount(0);
});
