import { describe, expect, it } from "vitest";

import { PRICING_PLANS } from "@/features/marketing/pricing-plans";
import { MARKETING_PAGES, SITE_URL, marketingMetadata } from "@/lib/site";

describe("marketingMetadata", () => {
  it("builds canonical, Open Graph and Twitter data from the page list", () => {
    const metadata = marketingMetadata("/pricing");
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/pricing`);
    expect(metadata.openGraph).toMatchObject({ url: `${SITE_URL}/pricing`, type: "website", siteName: "Donc" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("uses the site root without a trailing slash for the home page", () => {
    expect(marketingMetadata("/").alternates?.canonical).toBe(SITE_URL);
  });

  it("throws for a path that is not a marketing page", () => {
    expect(() => marketingMetadata("/dashboard")).toThrow(/desconhecida/);
  });

  it("keeps the pricing description in sync with the plans", () => {
    const description = MARKETING_PAGES.find((page) => page.path === "/pricing")!.description;
    for (const plan of PRICING_PLANS) expect(description).toContain(plan.price);
  });
});
