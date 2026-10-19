import { test, expect, type Page } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";
const MIN_TARGET = 44;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

type Finding = { selector: string; text: string; width: number; height: number };

/** Controles visíveis menores que 44×44 (exceto links dentro de texto corrido). */
async function smallTargets(page: Page): Promise<Finding[]> {
  return page.evaluate((min) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab]"));
    const result: { selector: string; text: string; width: number; height: number }[] = [];
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") continue;
      if (rect.bottom < 0 || rect.top > document.documentElement.scrollHeight) continue;
      if (node.closest("[aria-hidden=true], nextjs-portal, [data-nextjs-toast]")) continue;
      // Link em texto corrido (WCAG 2.5.8 isenta): inline e o pai tem bastante texto além do próprio link.
      if (node.matches("a") && style.display === "inline" && (node.parentElement?.textContent ?? "").length > (node.textContent ?? "").length + 12) continue;
      if (node.matches("input[type=checkbox], input[type=radio]") && node.closest("label")) continue; // o rótulo inteiro é o alvo
      if (rect.width < min - 0.5 || rect.height < min - 0.5) {
        result.push({
          selector: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${node.className && typeof node.className === "string" ? `.${node.className.split(/\s+/).slice(0, 3).join(".")}` : ""}`,
          text: (node.getAttribute("aria-label") || node.textContent || "").trim().slice(0, 40),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        });
      }
    }
    return result;
  }, MIN_TARGET);
}

async function expectMobileClean(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${label}: scroll horizontal de ${overflow}px`).toBeLessThanOrEqual(0);
  const small = await smallTargets(page);
  expect(small, `${label}: alvos de toque menores que ${MIN_TARGET}px`).toEqual([]);
}

async function login(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();
}

test("aulas em 390px: lista e aula sem scroll horizontal e com alvos de 44px", async ({ page }) => {
  await login(page);
  await page.goto("/aulas");
  await page.waitForLoadState("networkidle");
  await expectMobileClean(page, "/aulas");

  const modules = await (await page.request.get(`${API}/lessons/modules`)).json();
  type Item = { kind: string; lesson?: { id: number; locked?: boolean } };
  const lesson = (modules.data as { items?: Item[] }[])
    .flatMap((module) => module.items ?? [])
    .find((item) => item.kind === "lesson" && item.lesson && !item.lesson.locked)?.lesson;
  expect(lesson, "o seed precisa ter ao menos uma aula liberada para o aluno demo").toBeTruthy();

  await page.goto(`/aulas/${lesson!.id}`);
  await page.waitForLoadState("networkidle");
  await expectMobileClean(page, `/aulas/${lesson!.id}`);
});

test("editor de redação em 390px: temas e editor sem scroll horizontal e com alvos de 44px", async ({ page }) => {
  await login(page);
  await page.goto("/redacao");
  await page.waitForLoadState("networkidle");
  await expectMobileClean(page, "/redacao (temas)");

  await page.getByRole("button", { name: /Escrever agora/ }).first().click();
  await expect(page.getByRole("textbox").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectMobileClean(page, "/redacao (editor)");
});

test("checkout em 390px: planos sem scroll horizontal e com alvos de 44px", async ({ page }) => {
  const email = `mobile-${Date.now()}@e2e-donc.com`;
  const res = await page.request.post(`${API}/auth/register`, { data: { name: "Aluno Mobile", email, password: "senha12345", accept_terms: true } });
  expect(res.ok(), "cadastro deve responder 201").toBeTruthy();

  await page.goto("/assinatura");
  await expect(page.getByRole("button", { name: "Ir para pagamento" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectMobileClean(page, "/assinatura");
});
