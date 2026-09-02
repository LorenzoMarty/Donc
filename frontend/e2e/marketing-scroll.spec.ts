import { expect, test } from "@playwright/test";

test("marketing home scrolls with the mouse wheel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /A gente lê sua redação como a banca lê/i })).toBeVisible();

  const initialScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, 700);

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialScrollY);
});
