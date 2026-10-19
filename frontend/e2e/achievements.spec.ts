import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("perfil mostra conquistas e a aula concluída leva à próxima", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/perfil");
  const achievements = page.getByTestId("achievements");
  await expect(achievements).toBeVisible();
  await expect(achievements).toContainText("Primeira redação");
  await expect(achievements.locator("li")).toHaveCount(7);

  // Conclui uma aula ainda não concluída que tenha uma seguinte e confere o CTA.
  const modules = await (await page.request.get(`${API}/lessons/modules`)).json();
  type Item = { kind: string; lesson?: { id: number; locked?: boolean; progress: { completed: boolean } } };
  const flat = (modules.data as { items?: Item[] }[])
    .flatMap((module) => module.items ?? [])
    .filter((item) => item.kind === "lesson" && item.lesson)
    .map((item) => item.lesson!);
  const index = flat.findIndex((lesson, i) => !lesson.locked && !lesson.progress.completed && i + 1 < flat.length);
  test.skip(index < 0, "seed sem aula pendente com uma seguinte");

  await page.goto(`/aulas/${flat[index].id}`);
  await page.getByRole("button", { name: "Marcar concluida" }).click();
  await expect(page.getByTestId("next-lesson-cta")).toBeVisible();
});
