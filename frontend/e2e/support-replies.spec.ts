import { test, expect, request as playwrightRequest } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const ADMIN = { email: "admin@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("atalho de ajuda abre o formulário com contexto, e a resposta do admin aparece em Meus chamados", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/dashboard");
  const shortcut = page.getByTestId("help-shortcut");
  await expect(shortcut).toBeVisible();
  const box = await shortcut.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  await shortcut.click();

  await expect(page).toHaveURL(/\/suporte\?origem=%2Fdashboard/);
  await expect(page.getByLabel("Mensagem")).toHaveValue(/Estava na página \/dashboard/);

  await page.waitForLoadState("networkidle"); // aguarda a hidratação antes de digitar
  const subject = `Sugestão e2e ${Date.now()}`;
  await page.getByLabel("Categoria").selectOption("suggestion");
  await page.getByLabel("Assunto").fill(subject);
  await page.getByRole("button", { name: "Enviar chamado" }).click();
  await expect(page.getByText("Chamado enviado. Nossa equipe vai responder em breve.")).toBeVisible();

  // Admin responde pela API (contexto separado, com seu próprio cookie e CSRF).
  const admin = await playwrightRequest.newContext();
  const login = await admin.post(`${API}/auth/login`, { data: ADMIN });
  expect(login.ok()).toBeTruthy();
  const csrf = (await admin.storageState()).cookies.find((cookie) => cookie.name === "csrf_token")!.value;
  const list = await (await admin.get(`${API}/admin/support-tickets?limit=50`)).json();
  const ticket = list.data.items.find((item: { subject: string }) => item.subject === subject);
  const reply = await admin.post(`${API}/admin/support-tickets/${ticket.id}/reply`, {
    data: { message: "Obrigado pela sugestão, vamos avaliar." },
    headers: { "X-CSRF-Token": csrf },
  });
  expect(reply.ok()).toBeTruthy();

  await page.reload();
  const mine = page.getByTestId("my-tickets");
  await expect(mine).toContainText(subject);
  await expect(mine).toContainText("Obrigado pela sugestão, vamos avaliar.");
  await expect(mine).toContainText("Respondido");
});
