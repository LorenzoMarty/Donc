import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("paywall logo após o cadastro mostra a proposta de valor", async ({ page }) => {
  const email = `funnel-${Date.now()}@e2e-donc.com`;
  const res = await page.request.post(`${API}/auth/register`, { data: { name: "Aluno Funil", email, password: "senha12345", accept_terms: true } });
  expect(res.ok(), "cadastro deve responder 201").toBeTruthy();

  await page.goto("/dashboard"); // sem assinatura, o proxy manda direto para o paywall (sem trial)
  await expect(page).toHaveURL(/\/assinatura$/);
  await expect(page.getByTestId("value-proposition")).toContainText("Correção de redação por IA");
});

test("admin vê o funil com o cadastro recém-criado e a retenção", async ({ page }) => {
  const email = `funnel2-${Date.now()}@e2e-donc.com`;
  await page.request.post(`${API}/auth/register`, { data: { name: "Aluno Funil 2", email, password: "senha12345", accept_terms: true } });
  const login = await page.request.post(`${API}/auth/login`, { data: ADMIN });
  expect(login.ok()).toBeTruthy();

  await page.goto("/admin?tab=subscriptions");
  const funnel = page.getByTestId("funnel");
  await expect(funnel).toBeVisible();
  await expect(funnel).toContainText("Cadastro");
  await expect(funnel).toContainText("Primeira atividade");
  await expect(funnel).toContainText("Retorno em D1");
  await expect(funnel).toContainText("Retorno em D7");
  await expect(funnel).toContainText("Tempo até a 1ª atividade");
});
