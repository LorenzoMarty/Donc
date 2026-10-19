import { test, expect, request as playwrightRequest } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const ADMIN = { email: "admin@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("indicação: o link do perfil leva o código até o paywall do amigo, e o admin enxerga a indicação", async ({ page, browser }) => {
  // 1) Indicador vê o código e o link no perfil
  const login = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(login.ok(), "login API deve responder 200").toBeTruthy();
  await page.goto("/perfil");
  const code = (await page.getByTestId("referral-code").textContent())!.trim();
  expect(code).toMatch(/^AMIGO-[A-Z0-9]{6}$/);

  // 2) Amigo abre o link, cadastra pela tela e cai no paywall com o código preenchido
  const friend = await browser.newContext();
  const friendPage = await friend.newPage();
  await friendPage.goto(`/cadastro?ref=${code}`);
  await expect(friendPage.getByPlaceholder("Nome completo")).toBeVisible();
  await friendPage.waitForLoadState("networkidle");
  await friendPage.getByPlaceholder("Nome completo").fill("Amigo Indicado");
  await friendPage.getByPlaceholder("E-mail").fill(`amigo-${Date.now()}@e2e-donc.com`);
  await friendPage.getByPlaceholder("Senha").fill("senha12345");
  await friendPage.getByRole("checkbox").check();
  await friendPage.getByRole("button", { name: "Começar" }).click();
  await expect(friendPage).toHaveURL(/\/assinatura$/);
  await expect(friendPage.getByPlaceholder(/Cupom de desconto/)).toHaveValue(code);
  await friend.close();

  // 3) Admin vê o painel de indicações
  const admin = await playwrightRequest.newContext();
  const adminLogin = await admin.post(`${API}/auth/login`, { data: ADMIN });
  expect(adminLogin.ok()).toBeTruthy();
  const overview = await (await admin.get(`${API}/admin/referrals`)).json();
  expect(overview.data).toMatchObject({ total: expect.any(Number), pending: expect.any(Number), rewarded: expect.any(Number) });
});

test("admin vê a seção de indicações", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  await page.goto("/admin?tab=subscriptions");
  await expect(page.getByTestId("referrals-admin")).toContainText("Créditos a aplicar");
});
