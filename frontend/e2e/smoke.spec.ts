import { test, expect, type Page } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

/**
 * Autentica via API (imune a CORS do browser) e injeta o token onde a app espera:
 * cookie `access_token` (lido pelo middleware no SSR) + localStorage (hidratado pelo AuthContext).
 */
async function login(page: Page): Promise<string> {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();
  const token = (await res.json()).data.access_token as string;
  await page.context().addCookies([
    { name: "access_token", value: token, domain: "localhost", path: "/" },
  ]);
  await page.addInitScript((t) => {
    window.localStorage.setItem("access_token", t);
  }, token);
  return token;
}

test("smoke: hub-first → missão → feedback qualitativo → recomendação → estado preservado", async ({ page }) => {
  // 1-2. Home hub-first com treinador e os 7 sintomas.
  await login(page);
  await page.goto("/games");
  await expect(page.getByText("O que está travando sua redação?")).toBeVisible();
  await expect(page.getByText("Continue evoluindo")).toBeVisible();
  const hubLinks = page.locator('a[href^="/games/treino/"]');
  await expect(hubLinks).toHaveCount(7);

  // 3. Entrar na missão recomendada pelo treinador (goto direto pelo href = nav robusta p/ auth).
  const missionHref = await page.getByRole("link", { name: /Treinar agora/ }).getAttribute("href");
  expect(missionHref, "treinador deve recomendar uma missão").toBeTruthy();
  await page.goto(missionHref as string);
  await expect(page).toHaveURL(/\/games\/[^/]+\/[^/]+/);

  // 4-6. Responder rodadas até finalizar e ver o feedback qualitativo (S/A/B/C).
  for (let i = 0; i < 40; i++) {
    const finished = await page.getByRole("button", { name: /Jogar novamente/ }).isVisible().catch(() => false);
    if (finished) break;

    // Escolhe a primeira opção de resposta disponível do engine (duel/escalation/etc.).
    const answer = page
      .locator("button", { hasText: /Versão|Autêntico|Artificial|Nível|Diagnosticar|Reconstruir/ })
      .first();
    if (await answer.isVisible().catch(() => false)) {
      await answer.click();
    }
    // Avança para a próxima rodada ou finaliza.
    const next = page.getByRole("button", { name: /Próx|Finalizar|Próximo/ }).first();
    if (await next.isVisible().catch(() => false)) {
      await next.click();
    }
    await page.waitForTimeout(150);
  }

  // Resultado com nota qualitativa (nunca "% de acerto").
  await expect(page.getByRole("button", { name: /Jogar novamente/ })).toBeVisible({ timeout: 20_000 });

  // 7. Sinais cognitivos foram gravados no perfil adaptativo.
  const signals = await page.evaluate(() => {
    const raw = localStorage.getItem("donk.games.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.adaptive ?? null;
  });
  expect(signals).not.toBeNull();
  expect(signals.recentEvents.length).toBeGreaterThan(0);

  // 8-9. Recarregar e confirmar persistência do estado.
  await page.goto("/games");
  await expect(page.getByText("Continue evoluindo")).toBeVisible();
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem("donk.games.v1");
    return raw ? JSON.parse(raw).state.adaptive.recentEvents.length : 0;
  });
  expect(persisted).toBeGreaterThan(0);
});
