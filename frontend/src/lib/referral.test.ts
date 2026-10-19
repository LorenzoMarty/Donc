import { beforeEach, describe, expect, it } from "vitest";

import { captureReferralFromUrl, clearStoredReferral, readStoredReferral } from "@/lib/referral";

describe("referral link capture", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores a valid code from the query string, normalized to upper case", () => {
    captureReferralFromUrl("?ref=amigo-ab3k9z");
    expect(readStoredReferral()).toBe("AMIGO-AB3K9Z");
  });

  it("ignores codes that do not look like a referral code", () => {
    captureReferralFromUrl("?ref=<script>");
    captureReferralFromUrl("?ref=PROMO10");
    captureReferralFromUrl("");
    expect(readStoredReferral()).toBeNull();
  });

  it("clears the stored code", () => {
    captureReferralFromUrl("?ref=AMIGO-ABCDEF");
    clearStoredReferral();
    expect(readStoredReferral()).toBeNull();
  });
});
