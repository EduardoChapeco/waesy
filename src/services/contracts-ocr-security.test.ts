import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("contract OCR security boundary", () => {
  it("requires staff and rate limiting before multimodal AI", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const extractContractDataFromOcr");
    const guard = source.indexOf("const identity = await requireStaff();", start);
    const rateLimit = source.indexOf("enforceRateLimit(", guard);
    const aiCall = source.indexOf("executeUnifiedAiCall({", start);
    expect(start).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(start);
    expect(rateLimit).toBeGreaterThan(guard);
    expect(aiCall).toBeGreaterThan(rateLimit);
  });

  it("accepts only bounded base64 uploads and does not fetch caller URLs", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const extractContractDataFromOcr");
    const end = source.indexOf("// ─── Assinatura do Envelope", start);
    const block = source.slice(start, end);
    expect(block).toContain("base64: z.string().max(12_000_000");
    expect(block).not.toContain("imageUrl");
    expect(block).not.toContain("fetch(");
  });
});
