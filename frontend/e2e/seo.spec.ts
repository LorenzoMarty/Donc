import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = ["/", "/pricing", "/plataforma", "/trilhas", "/sobre", "/termos", "/privacidade", "/cancelamento"];

test("robots.txt aponta o sitemap e bloqueia as áreas logadas", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  expect(body).toContain("Disallow: /dashboard");
  expect(body).toContain("Disallow: /api/");
});

test("sitemap.xml lista todas as páginas públicas", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  for (const path of PUBLIC_PAGES.filter((item) => item !== "/")) expect(body).toContain(`${path}</loc>`);
  expect(body).not.toContain("/dashboard");
});

for (const path of PUBLIC_PAGES) {
  test(`página ${path} tem title, description, canonical e imagem de compartilhamento`, async ({ page }) => {
    await page.goto(path);
    expect((await page.title()).length).toBeGreaterThan(10);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toBeTruthy();
    // a URL absoluta usa NEXT_PUBLIC_SITE_URL (outro host no build de teste): checa só o caminho
    const imageRes = await page.request.get(new URL(image!).pathname);
    expect(imageRes.ok()).toBeTruthy();
    expect(imageRes.headers()["content-type"]).toContain("image/png");
  });
}

test("pricing publica JSON-LD de produto e FAQ", async ({ page }) => {
  await page.goto("/pricing");
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(raw!);
  const types = (data["@graph"] as { "@type": string }[]).map((node) => node["@type"]);
  expect(types).toEqual(["Product", "FAQPage"]);
  const offers = (data["@graph"][0] as { offers: { price: string }[] }).offers;
  expect(offers.map((offer) => offer.price)).toEqual(["59", "588"]);
});
