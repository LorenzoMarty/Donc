import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("manifest do PWA é servido, aponta ícones PNG válidos e o Chromium não vê erro de instalação", async ({ page, request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest).toMatchObject({ short_name: "Donc", display: "standalone", start_url: "/dashboard" });
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const iconRes = await request.get(icon.src);
    expect(iconRes.ok(), icon.src).toBeTruthy();
    expect(iconRes.headers()["content-type"]).toContain("image/png");
  }
  expect((manifest.icons as { sizes: string }[]).map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const client = await page.context().newCDPSession(page);
  const { installabilityErrors } = await client.send("Page.getInstallabilityErrors");
  // Em http://localhost o Chromium considera o contexto seguro; qualquer erro restante é real.
  expect(installabilityErrors, JSON.stringify(installabilityErrors)).toEqual([]);
});

test("perfil permite desligar os lembretes e o link do e-mail é público", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/perfil");
  const card = page.getByTestId("reminders-card");
  const checkbox = card.getByRole("checkbox");
  await expect(checkbox).toBeChecked();
  await page.waitForLoadState("networkidle");
  // controlado: o estado só muda depois da API responder, então clica e confere o resultado
  await checkbox.click();
  await expect(page.getByText("Lembretes desativados.")).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(page.getByText("Lembretes ativados.")).toBeVisible();
  await expect(checkbox).toBeChecked();

  await page.goto("/lembretes/cancelar?token=1.token-invalido");
  await expect(page.getByText("Link inválido ou expirado")).toBeVisible();
});
