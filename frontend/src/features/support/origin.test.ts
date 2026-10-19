import { describe, expect, it } from "vitest";

import { safeOrigin } from "@/features/support/origin";

describe("safeOrigin", () => {
  it("accepts internal app paths", () => {
    expect(safeOrigin("/dashboard")).toBe("/dashboard");
    expect(safeOrigin("/aulas/12")).toBe("/aulas/12");
    expect(safeOrigin("/")).toBe("/");
  });

  it("rejects external, protocol-relative and noisy values", () => {
    for (const value of ["//evil.com", "//evil", "https://evil.com", "/a?x=1", "/a b", "/<script>", "javascript:alert(1)", "", null, undefined]) {
      expect(safeOrigin(value as string | null | undefined)).toBeNull();
    }
  });
});
