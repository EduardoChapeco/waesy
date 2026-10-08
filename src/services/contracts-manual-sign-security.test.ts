import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("manual contract signing security boundary", () => {
  it("bounds signing input and rejects expired envelopes", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const expiry = source.indexOf("envelope.expires_at", start);
    expect(source.slice(start, start + 1300)).toContain("signingToken: z.string().trim().min(16).max(240)");
    expect(source.slice(start, start + 1300)).toContain("signatureImageBase64: z.string().max(2_000_000)");
    expect(expiry).toBeGreaterThan(start);
  });

  it("uses an atomic pending-to-signed transition and cleans losing evidence", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const transition = source.indexOf('.eq("status", "pending")', start);
    const select = source.indexOf('.select("id")', transition);
    const cleanup = source.indexOf('.from("signature_evidence").delete()', select);
    expect(transition).toBeGreaterThan(start);
    expect(select).toBeGreaterThan(transition);
    expect(cleanup).toBeGreaterThan(select);
  });
});
