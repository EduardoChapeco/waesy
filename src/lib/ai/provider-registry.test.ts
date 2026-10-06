import { describe, expect, it } from "vitest";
import { buildFallbackChain, getTextProviderDefinition, TEXT_PROVIDER_REGISTRY } from "./provider-registry";

describe("text provider registry", () => {
  it("declares the requested reasoning/code providers", () => {
    expect(getTextProviderDefinition("anthropic").capabilities).toContain("reasoning");
    expect(getTextProviderDefinition("deepseek").capabilities).toContain("code");
    expect(getTextProviderDefinition("gemini").freeTier).toBe(true);
  });

  it("builds a finite chain without duplicate providers", () => {
    for (const provider of Object.keys(TEXT_PROVIDER_REGISTRY) as Array<keyof typeof TEXT_PROVIDER_REGISTRY>) {
      const chain = buildFallbackChain(provider);
      expect(chain[0]).toBe(provider);
      expect(new Set(chain).size).toBe(chain.length);
      expect(chain.length).toBeLessThanOrEqual(Object.keys(TEXT_PROVIDER_REGISTRY).length);
    }
  });
});
