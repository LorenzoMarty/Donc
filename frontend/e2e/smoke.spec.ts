import { test, expect, type Page } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

/**
 * Autentica via API (imune a CORS do browser). O backend seta cookies HttpOnly no contexto do
 * browser; o AuthContext hidrata o usuário via /auth/me.
 */
async function login(page: Page): Promise<void> {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();
  const payload = await res.json();
  expect(payload.data.user.email).toBe(DEMO.email);
}

// O jogo "Quiz E2E" (categoria estrutura, 2 perguntas) é semeado por backend/scripts/e2e_prepare.py.
test("smoke: categorias → jogo → resultado → tentativa persistida no backend", async ({ page }) => {
  await login(page);

  // Categorias de treino (as 7 do catálogo).
  await page.goto("/games");
  await expect(page.getByRole("heading", { name: "Treino", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible();
  for (const slug of ["estrutura", "coesao", "argumentacao", "repertorio", "gramatica", "competencias-enem", "desafios-diarios"]) {
    await expect(page.locator(`main a[href="/games/${slug}"]`)).toBeVisible();
  }

  // Categoria → jogo semeado.
  await page.goto("/games/estrutura");
  const gameCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Quiz E2E" }) });
  const gameLink = gameCard.getByRole("link", { name: "Jogar" });
  await expect(gameLink).toBeVisible();
  await gameLink.click();
  await expect(page).toHaveURL(/\/games\/estrutura\/ai-\d+/);

  // Responde as 2 perguntas (a ordem das opções é embaralhada, então clica pelo texto).
  const done = page.getByText("Sessão concluída");
  for (let i = 0; i < 2; i++) {
    await expect(page.getByText(`Questao ${i + 1} de 2`)).toBeVisible();
    await page.getByRole("button", { name: "Alternativa correta" }).click();
  }
  await expect(done).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Voltar para categoria" })).toBeVisible();

  // A tentativa chegou ao backend (POST /games/complete é fire-and-forget no front).
  await expect
    .poll(async () => {
      const res = await page.request.get(`${API}/games/progress`);
      const rows: { game_id: string; plays: number }[] = (await res.json()).data ?? [];
      return rows.find((row) => row.game_id.startsWith("ai-"))?.plays ?? 0;
    })
    .toBe(1);
});
