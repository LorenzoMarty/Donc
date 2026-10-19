import { describe, expect, it } from "vitest";

import { WHATS_NEW_ENTRIES, hasUnreadWhatsNew } from "@/features/whats-new/entries";

describe("whats new entries", () => {
  it("has unique ids and is ordered newest first", () => {
    const ids = WHATS_NEW_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const dates = WHATS_NEW_ENTRIES.map((entry) => entry.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("is unread until the latest entry id is stored", () => {
    expect(hasUnreadWhatsNew(null, "b")).toBe(true);
    expect(hasUnreadWhatsNew("a", "b")).toBe(true);
    expect(hasUnreadWhatsNew("b", "b")).toBe(false);
    expect(hasUnreadWhatsNew(null, null)).toBe(false);
  });
});
