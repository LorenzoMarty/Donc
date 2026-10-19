import { test, expect, type Page } from "@playwright/test";

const AXE_PATH = require.resolve("axe-core/axe.min.js");

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

type AxeNode = { target: string[]; html: string; failureSummary?: string };
type AxeViolation = { id: string; impact: string | null; help: string; nodes: AxeNode[] };

async function audit(page: Page): Promise<AxeViolation[]> {
  await page.waitForLoadState("networkidle");
  await page.addScriptTag({ path: AXE_PATH });
  const result = await page.evaluate(async () => {
    // @ts-expect-error axe é injetado no window pelo script acima
    return window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
  });
  return (result as { violations: AxeViolation[] }).violations;
}

/** Só critical/serious reprovam (critério da issue: "sem violações críticas"); o resto aparece no relatório. */
function blocking(violations: AxeViolation[]) {
  return violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 3).map((node) => `${node.target.join(" ")} :: ${node.html.slice(0, 120)}`),
    }));
}

const PUBLIC = ["/", "/pricing", "/login", "/cadastro", "/plataforma"];
for (const path of PUBLIC) {
  test(`a11y (público) ${path}: sem violações críticas ou sérias`, async ({ page }) => {
    await page.goto(path);
    expect(blocking(await audit(page))).toEqual([]);
  });
}

const LOGGED = ["/dashboard", "/aulas", "/redacao", "/perfil", "/suporte"];
for (const path of LOGGED) {
  test(`a11y (logado) ${path}: sem violações críticas ou sérias`, async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
    expect(res.ok(), "login API deve responder 200").toBeTruthy();
    await page.goto(path);
    expect(blocking(await audit(page))).toEqual([]);
  });
}

test("a11y (logado) /assinatura: sem violações críticas ou sérias", async ({ page }) => {
  const email = `a11y-${Date.now()}@e2e-donc.com`;
  const res = await page.request.post(`${API}/auth/register`, { data: { name: "Aluno A11y", email, password: "senha12345", accept_terms: true } });
  expect(res.ok(), "cadastro deve responder 201").toBeTruthy();
  await page.goto("/assinatura");
  expect(blocking(await audit(page))).toEqual([]);
});
