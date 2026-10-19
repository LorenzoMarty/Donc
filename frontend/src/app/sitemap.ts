import type { MetadataRoute } from "next";

import { MARKETING_PAGES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path === "/" ? "" : page.path}`,
    changeFrequency: page.priority >= 0.7 ? "weekly" : "monthly",
    priority: page.priority,
  }));
}
