import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("dashboard mostra a missão de hoje com atividade e aula", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/dashboard");
  const mission = page.getByTestId("daily-mission");
  await expect(mission).toBeVisible();
  await expect(mission.getByRole("heading", { name: "Missão de hoje" })).toBeVisible();
  await expect(mission.getByRole("link")).not.toHaveCount(0);
  await expect(mission).toContainText(/passos|Missão cumprida/);
});
