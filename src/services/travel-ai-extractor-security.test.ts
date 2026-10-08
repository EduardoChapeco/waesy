import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { ParseTravelMediaInputSchema } from "./travel-ai-extractor.functions";

describe("travel media extractor security boundary", () => {
  it("rejects empty extraction requests", () => {
    expect(ParseTravelMediaInputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects oversized raw text and base64 payloads", () => {
    expect(ParseTravelMediaInputSchema.safeParse({ rawText: "x".repeat(100_001) }).success).toBe(false);
    expect(ParseTravelMediaInputSchema.safeParse({ fileBase64: "x".repeat(12_000_001), fileMime: "image/png" }).success).toBe(false);
  });

  it("requires staff and rate limiting before the service-role client or AI call", async () => {
    const source = await readFile(new URL("./travel-ai-extractor.functions.ts", import.meta.url), "utf8");
    const guard = source.indexOf("const identity = await requireStaff();");
    const rateLimit = source.indexOf("enforceRateLimit(", guard);
    const client = source.indexOf("const supabase = getServerClient();", rateLimit);
    const aiCall = source.indexOf("executeUnifiedAiCall({", client);
    expect(guard).toBeGreaterThan(-1);
    expect(rateLimit).toBeGreaterThan(guard);
    expect(client).toBeGreaterThan(rateLimit);
    expect(aiCall).toBeGreaterThan(client);
  });
});
