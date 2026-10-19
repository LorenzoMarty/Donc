import { test, expect } from "@playwright/test";

const DEMO = { email: "aluno@demo.com", password: "12345678" };
const API = "http://localhost:8001/api/v1";

test("perfil: baixa os dados em JSON e o modal de exclusão exige senha", async ({ page }) => {
  const res = await page.request.post(`${API}/auth/login`, { data: DEMO });
  expect(res.ok(), "login API deve responder 200").toBeTruthy();

  await page.goto("/perfil");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar meus dados" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meus-dados-donc.json");

  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  const confirm = page.getByRole("button", { name: "Excluir definitivamente" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Confirme sua senha").fill("senha-errada");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText("Senha incorreta.")).toBeVisible();
});
