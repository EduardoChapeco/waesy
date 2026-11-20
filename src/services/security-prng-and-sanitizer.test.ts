import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sanitizeNarrativeDescription } from "@/lib/ad-engine/content-blocks/sanitizer";

describe("Ponytail Security Hardening: PRNG & HTML Sanitization", () => {
  it("does not use Math.random() for tokens, passwords, or PINs in hardened BFF files", () => {
    const checks: Array<{ file: string; forbiddenPattern: RegExp; requiredPattern: RegExp }> = [
      {
        file: "src/services/contracts.functions.ts",
        forbiddenPattern: /signingToken\s*=\s*[\s\S]{0,120}Math\.random/,
        requiredPattern: /signingToken\s*=\s*crypto\.randomUUID\(\)/,
      },
      {
        file: "src/services/admin-team.functions.ts",
        forbiddenPattern: /effectiveInitialPassword\s*=\s*[\s\S]{0,160}Math\.random/,
        requiredPattern: /effectiveInitialPassword\s*=\s*[\s\S]{0,160}crypto\.randomUUID\(\)/,
      },
      {
        file: "src/services/onboarding.functions.ts",
        forbiddenPattern: /password:\s*`Waesy#\$\{Math\.floor\(100000 \+ Math\.random/,
        requiredPattern: /password:\s*`Waesy#\$\{crypto\.randomUUID\(\)/,
      },
      {
        file: "src/services/company-delivery.functions.ts",
        forbiddenPattern: /(?:token|confirmationPin)\s*=[\s\S]{0,120}Math\.random/,
        requiredPattern: /crypto\.getRandomValues\(pinBuffer\)/,
      },
      {
        file: "src/services/branded-app.functions.ts",
        forbiddenPattern: /function createCryptoMagicToken[\s\S]{0,300}Math\.random/,
        requiredPattern: /Web Crypto API indisponível para gerar magic token seguro/,
      },
      {
        file: "src/services/chat.functions.ts",
        forbiddenPattern: /password:\s*password \|\| `Waesy@\$\{Math\.floor/,
        requiredPattern: /password:\s*password \|\| `Waesy@\$\{crypto\.randomUUID\(\)/,
      },
    ];

    for (const check of checks) {
      const content = fs.readFileSync(path.resolve(process.cwd(), check.file), "utf8");
      expect(content, `${check.file} still uses Math.random()`).not.toMatch(check.forbiddenPattern);
      expect(content, `${check.file} missing Web Crypto hardening`).toMatch(check.requiredPattern);
    }
  });

  it("sanitizes stored policy HTML against script injection and event handlers", () => {
    const dirty =
      '<p>Termos</p><script>alert(1)</script><img src=x onerror="fetch(\'https://evil.test\')"><a href="javascript:alert(2)">Link</a>';
    const clean = sanitizeNarrativeDescription(dirty);

    expect(clean).toContain("<p>Termos</p>");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("onerror=");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it("ensures _store.politicas.$slug.tsx passes section HTML through sanitizeNarrativeDescription", () => {
    const routePath = path.resolve(process.cwd(), "src/routes/_store.politicas.$slug.tsx");
    const content = fs.readFileSync(routePath, "utf8");
    expect(content).toContain("sanitizeNarrativeDescription(section.content?.html");
  });
});
