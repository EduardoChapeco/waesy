import { describe, expect, it } from "vitest";
import { getSafeBuilderHref, isSafeBuilderHref } from "./safe-href";

describe("safe builder navigation href", () => {
  it.each([
    "#",
    "#pricing_2026",
    "/contato?origem=site",
    "https://wa.me/5549300000000",
    "mailto:contato@example.com?subject=Olá",
    "tel:+55 (49) 3000-0000",
  ])("accepts safe destination %s", (href) => {
    expect(getSafeBuilderHref(href)).toBe(href);
    expect(isSafeBuilderHref(href)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<svg/onload=alert(1)>",
    "blob:https://example.com/123",
    "file:///etc/passwd",
    "http://example.com/insecure",
    "//evil.example/path",
    "https://user:password@example.com/path",
    "\\\\evil.example\\path",
    "mailto:javascript:alert(1)",
  ])("rejects unsafe destination %s", (href) => {
    expect(getSafeBuilderHref(href)).toBeUndefined();
    expect(isSafeBuilderHref(href)).toBe(false);
  });

  it("rejects non-string and oversized input", () => {
    expect(getSafeBuilderHref(null)).toBeUndefined();
    expect(getSafeBuilderHref(42)).toBeUndefined();
    expect(getSafeBuilderHref(`/${"a".repeat(2048)}`)).toBeUndefined();
  });
});
