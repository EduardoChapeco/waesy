import { describe, expect, it } from "vitest";
import { validateBrandSourceUrl } from "./brand-source-url";

describe("validateBrandSourceUrl", () => {
  it("accepts a public HTTPS origin", () => {
    expect(validateBrandSourceUrl("https://example.com/brand").hostname).toBe("example.com");
  });

  it.each([
    "http://example.com",
    "https://localhost",
    "https://admin.localhost",
    "https://service.internal",
    "https://127.0.0.1",
    "https://10.0.0.2",
    "https://172.16.0.1",
    "https://192.168.1.10",
    "https://169.254.169.254",
    "https://[::1]",
    "https://example.com:8443",
    "https://user:pass@example.com",
  ])("rejects unsafe source %s", (source) => {
    expect(() => validateBrandSourceUrl(source)).toThrow();
  });
});
