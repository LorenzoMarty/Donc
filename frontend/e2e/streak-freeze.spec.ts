import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("dashboard mostra a sequência persistida no servidor com o congelamento semanal", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  // Uma atividade real hoje (aula concluída) mantém a sequência viva; o dashboard só mostra o que o aluno ainda pode manter.
  const csrf = (await page.context().storageState()).cookies.find((cookie) => cookie.name === "csrf_token")!.value;
  const modules = await (await page.request.get(`${API}/lessons/modules`)).json();
  type Item = { kind: string; lesson?: { id: number; locked?: boolean } };
  const lesson = (modules.data as { items?: Item[] }[])
    .flatMap((module) => module.items ?? [])
    .find((item) => item.kind === "lesson" && item.lesson && !item.lesson.locked)?.lesson;
  expect(lesson, "o seed precisa ter uma aula liberada").toBeTruthy();
  const progress = await page.request.put(`${API}/lessons/${lesson!.id}/progress`, {
    data: { progress_percent: 100, last_position_seconds: 300, completed: true },
    headers: { "X-CSRF-Token": csrf },
  });
  expect(progress.ok()).toBeTruthy();

  await page.goto("/dashboard");
  await expect(page.getByText("Sequência", { exact: true })).toBeVisible();
  await expect(page.getByText(/congelamento da semana (disponível|usado)/)).toBeVisible();
});
